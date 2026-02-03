import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  createItem,
  updateItem,
  type Item,
  type ItemCreate,
  type ItemTipo,
} from "../api/items";
import {
  searchTmdbMovies,
  searchTmdbTv,
  getTmdbMovieDetails,
  getTmdbTvDetails,
  searchJikanAnime,
  getJikanAnimeDetails,
  getYoutubeFromUrl,
  isTmdbConfigured,
  type SearchSuggestion,
  type FormFillData,
} from "../api/search";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS, GENRE_OPTIONS } from "../lib/constants";
import { IconFilm, IconTv, IconPlay, IconYoutube, IconX, IconPlus } from "./icons";
import "./ItemForm.css";

const GENRE_SET = new Set(GENRE_OPTIONS);

function applyFormFill(
  data: FormFillData,
  setValue: (name: keyof FormData, value: unknown) => void,
  currentTags: string[],
  currentGeneros: string[]
) {
  if (data.titulo) setValue("titulo", data.titulo);
  if (data.descripcion !== undefined) setValue("descripcion", data.descripcion ?? "");
  if (data.posterUrl !== undefined) setValue("posterUrl", data.posterUrl ?? "");
  if (data.url !== undefined) setValue("url", data.url ?? "");
  const genresFromApi = data.generos ?? [];
  const generosToSet = [...new Set([...currentGeneros, ...genresFromApi.filter((g) => GENRE_SET.has(g as typeof GENRE_OPTIONS[number]))])];
  if (generosToSet.length) setValue("generosStr", generosToSet.join(", "));
  const extraTags = data.tags ?? [];
  const extraGenreTags = genresFromApi.filter((g) => !GENRE_SET.has(g as typeof GENRE_OPTIONS[number]));
  const allTags = [...new Set([...currentTags, ...extraTags, ...extraGenreTags])];
  if (allTags.length) setValue("tagsStr", allTags.join(", "));
}

const schema = z.object({
  tipo: z.enum(["movie", "series", "anime", "youtube"]),
  titulo: z.string().min(1, "Título requerido"),
  descripcion: z.string().optional(),
  posterUrl: z.string().url().optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  visto: z.boolean(),
  tagsStr: z.string().optional(),
  generosStr: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_ICONS: Record<ItemTipo, React.ComponentType<{ className?: string }>> = {
  movie: IconFilm,
  series: IconTv,
  anime: IconPlay,
  youtube: IconYoutube,
};

function splitTrim(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
}

export default function ItemForm({
  item,
  onSuccess,
  onCancel,
  existingTags = [],
}: {
  item?: Item;
  onSuccess: () => void;
  onCancel: () => void;
  existingTags?: string[];
}) {
  const isEdit = !!item;
  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFill, setLoadingFill] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? {
          tipo: item.tipo,
          titulo: item.titulo,
          descripcion: item.descripcion ?? "",
          posterUrl: item.posterUrl ?? "",
          url: item.url ?? "",
          visto: item.visto,
          tagsStr: item.tags?.join(", ") ?? "",
          generosStr: item.generos?.join(", ") ?? "",
        }
      : {
          tipo: "movie",
          titulo: "",
          descripcion: "",
          posterUrl: "",
          url: "",
          visto: false,
          tagsStr: "",
          generosStr: "",
        },
  });

  const tipo = watch("tipo");
  const tagsStr = watch("tagsStr") ?? "";
  const generosStr = watch("generosStr") ?? "";
  const tags = splitTrim(tagsStr);
  const generos = splitTrim(generosStr);

  // Búsqueda con debounce (películas, series, anime)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        if (tipo === "movie") setSuggestions(await searchTmdbMovies(q));
        else if (tipo === "series") setSuggestions(await searchTmdbTv(q));
        else if (tipo === "anime") setSuggestions(await searchJikanAnime(q));
        else setSuggestions([]);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, tipo]);

  const onSelectSuggestion = useCallback(
    async (s: SearchSuggestion) => {
      setShowDropdown(false);
      setSearchQuery("");
      setSuggestions([]);
      setLoadingFill(true);
      try {
        let data: FormFillData | null = null;
        if (tipo === "movie") data = await getTmdbMovieDetails(s.id);
        else if (tipo === "series") data = await getTmdbTvDetails(s.id);
        else if (tipo === "anime") data = await getJikanAnimeDetails(s.id);
        if (data) {
          const currentTags = splitTrim(getValues("tagsStr"));
          const currentGeneros = splitTrim(getValues("generosStr"));
          applyFormFill(data, setValue, currentTags, currentGeneros);
        }
      } catch {
        // ignore
      } finally {
        setLoadingFill(false);
      }
    },
    [tipo, setValue, getValues]
  );

  const onFillFromYoutubeUrl = useCallback(async () => {
    const urlValue = (getValues("url") ?? "").trim();
    if (!urlValue) return;
    setLoadingFill(true);
    try {
      const data = await getYoutubeFromUrl(urlValue);
      if (data) {
        const currentTags = splitTrim(getValues("tagsStr"));
        const currentGeneros = splitTrim(getValues("generosStr"));
        applyFormFill(data, setValue, currentTags, currentGeneros);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFill(false);
    }
  }, [getValues, setValue]);

  const showSearchAutocomplete =
    !isEdit &&
    (tipo === "movie" || tipo === "series" || tipo === "anime") &&
    (tipo === "anime" || isTmdbConfigured());
  const showYoutubeFill = !isEdit && tipo === "youtube";

  const toggleGenre = (g: string) => {
    const next = generos.includes(g) ? generos.filter((x) => x !== g) : [...generos, g];
    setValue("generosStr", next.join(", "));
  };

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setValue("tagsStr", tags.length ? `${tagsStr}, ${t}` : t);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setValue("tagsStr", tags.filter((t) => t !== tag).join(", "));
  };

  const addExistingTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setValue("tagsStr", tags.length ? `${tagsStr}, ${tag}` : tag);
    }
  };

  const createMutation = useMutation({
    mutationFn: (body: ItemCreate) => createItem(body),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Partial<ItemCreate>) => updateItem(item!.id, body),
    onSuccess,
  });

  const onSubmit = (data: FormData) => {
    const body: ItemCreate = {
      tipo: data.tipo,
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      posterUrl: data.posterUrl || undefined,
      url: data.url || undefined,
      visto: data.visto,
      tags: splitTrim(data.tagsStr),
      generos: splitTrim(data.generosStr),
    };
    if (isEdit) updateMutation.mutate(body);
    else createMutation.mutate(body);
  };

  const loading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const existingTagsFiltered = existingTags.filter((t) => !tags.includes(t)).slice(0, 10);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="item-form">
      {/* Tipo: grid de 4 botones con iconos */}
      <div className="form-block">
        <label className="form-label">Tipo</label>
        <div className="type-selector">
          {(Object.keys(MEDIA_TYPE_LABELS) as ItemTipo[]).map((t) => {
            const Icon = TYPE_ICONS[t];
            const isSelected = tipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setValue("tipo", t)}
                className={`type-btn ${isSelected ? MEDIA_TYPE_COLORS[t] : "type-btn-unselected"}`}
              >
                <Icon className="type-btn-icon" />
                <span>{MEDIA_TYPE_LABELS[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Autocompletar desde API (película, serie, anime) */}
      {showSearchAutocomplete && (
        <div className="form-block form-autocomplete-wrap" ref={dropdownRef}>
          <label className="form-label">
            Buscar para rellenar automáticamente ({MEDIA_TYPE_LABELS[tipo]})
          </label>
          <div className="autocomplete-input-wrap">
            <input
              type="text"
              className="form-input"
              placeholder={
                tipo === "movie"
                  ? "Ej: Inception, El padrino..."
                  : tipo === "series"
                    ? "Ej: Breaking Bad, Juego de tronos..."
                    : "Ej: One Piece, Attack on Titan..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {loadingSearch && <span className="autocomplete-spinner" aria-hidden />}
            {showDropdown && suggestions.length > 0 && (
              <ul className="autocomplete-dropdown" role="listbox">
                {suggestions.map((s) => (
                  <li
                    key={`${s.tipo}-${s.id}`}
                    role="option"
                    className="autocomplete-option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectSuggestion(s);
                    }}
                  >
                    {s.posterUrl && (
                      <img
                        src={s.posterUrl}
                        alt=""
                        className="autocomplete-option-poster"
                      />
                    )}
                    <div className="autocomplete-option-text">
                      <span className="autocomplete-option-title">{s.title}</span>
                      {s.subtitle && (
                        <span className="autocomplete-option-subtitle">
                          {s.subtitle}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* YouTube: rellenar desde URL */}
      {showYoutubeFill && (
        <div className="form-block">
          <label className="form-label">Rellenar desde URL de YouTube</label>
          <p className="form-hint">
            Pega la URL del video abajo en &quot;URL de YouTube&quot; y pulsa el botón para
            rellenar título e imagen automáticamente.
          </p>
        </div>
      )}

      <div className="form-block">
        <label htmlFor="titulo" className="form-label">Título *</label>
        <input
          id="titulo"
          type="text"
          className="form-input"
          placeholder="Nombre del contenido"
          {...register("titulo")}
        />
        {errors.titulo && <span className="field-error">{errors.titulo.message}</span>}
      </div>

      <div className="form-block">
        <label htmlFor="posterUrl" className="form-label">URL de imagen</label>
        <input
          id="posterUrl"
          type="url"
          className="form-input"
          placeholder="https://..."
          {...register("posterUrl")}
        />
      </div>

      <div className="form-block">
        <label htmlFor="url" className="form-label">
          {tipo === "youtube" ? "URL de YouTube" : "URL (enlace externo)"}
        </label>
        <div className="url-input-row">
          <input
            id="url"
            type="url"
            className="form-input"
            placeholder={tipo === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
            {...register("url")}
          />
          {showYoutubeFill && (
            <button
              type="button"
              className="btn-fill-youtube"
              onClick={onFillFromYoutubeUrl}
              disabled={loadingFill}
            >
              {loadingFill ? "..." : "Rellenar"}
            </button>
          )}
        </div>
      </div>

      <div className="form-block">
        <label htmlFor="descripcion" className="form-label">Descripción</label>
        <textarea
          id="descripcion"
          className="form-textarea"
          rows={3}
          placeholder="Breve descripción..."
          {...register("descripcion")}
        />
      </div>

      {/* Géneros: chips toggle */}
      <div className="form-block">
        <label className="form-label">Géneros</label>
        <div className="chips-wrap">
          {GENRE_OPTIONS.map((g) => {
            const isSelected = generos.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`chip ${isSelected ? "chip-selected" : "chip-unselected"}`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags: badges + input + existentes */}
      <div className="form-block">
        <label className="form-label">Tags</label>
        {tags.length > 0 && (
          <div className="tags-badges">
            {tags.map((tag) => (
              <span key={tag} className="tag-badge">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="tag-badge-remove" aria-label="Quitar">
                  <IconX className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="tags-input-row">
          <input
            type="text"
            className="form-input"
            placeholder="Nuevo tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <button type="button" className="btn-icon-add" onClick={addTag} aria-label="Añadir tag">
            <IconPlus className="w-4 h-4" />
          </button>
        </div>
        {existingTagsFiltered.length > 0 && (
          <div className="tags-existentes">
            <p className="tags-existentes-label">Tags existentes:</p>
            <div className="tags-existentes-wrap">
              {existingTagsFiltered.map((tag) => (
                <button key={tag} type="button" className="tag-suggestion" onClick={() => addExistingTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isEdit && (
        <label className="form-checkbox">
          <input type="checkbox" {...register("visto")} />
          Marcado como visto
        </label>
      )}

      {error && (
        <p className="form-error">{error instanceof Error ? error.message : "Error"}</p>
      )}

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
