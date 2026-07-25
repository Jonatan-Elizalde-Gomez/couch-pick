import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  getItems,
  getItemsPaginated,
  shuffle,
  updateItem,
  getNextWatchStatus,
  type Item,
  type ItemTipo,
  type ShuffleFilters,
  type WatchStatus,
} from "../api/items";
import { getFilterPreferences, saveFilterPreferences } from "../api/preferences";
import { GENRE_GROUP_LABELS, getGenreGroupsForTypes, getVisibleGenreOptions, MEDIA_TYPE_LABELS } from "../lib/constants";
import {
  IconFilm,
  IconTv,
  IconPlay,
  IconYoutube,
  IconTrash2,
  IconSearch,
  IconSettings,
  IconFilter,
  IconChevronUp,
  IconChevronDown,
  IconShuffle,
  IconLogOut,
  IconArrowLeft,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconCircleDot,
  IconPlus,
  IconX,
} from "../components/icons";
import ItemCard from "../components/ItemCard";
import ItemDetailModal from "../components/ItemDetailModal";
import ShuffleAnimation from "../components/ShuffleAnimation";
import ConfirmDialog from "../components/ConfirmDialog";
import "./Main.css";

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;
const CARDS_PER_SCROLL = 3;
const PAGE_SIZE = 24;
const SCROLL_LOAD_THRESHOLD = 400;

const TIPOS: ItemTipo[] = ["movie", "series", "anime", "youtube"];
const TYPE_ICONS = { movie: IconFilm, series: IconTv, anime: IconPlay, youtube: IconYoutube };
const STATUS_OPTIONS: Array<{
  value: WatchStatus;
  label: string;
  Icon: ({ className }: { className?: string }) => JSX.Element;
}> = [
  { value: "unwatched", label: "No vistos", Icon: IconEyeOff },
  { value: "watching", label: "Viendo", Icon: IconCircleDot },
  { value: "watched", label: "Vistos", Icon: IconEye },
];
const emptyFilters: ShuffleFilters = {
  tipo: [],
  tipoExcluir: [],
  genero: [],
  generoExcluir: [],
  tag: [],
  tagExcluir: [],
  estado: [],
  estadoExcluir: [],
  itemId: [],
  itemIdExcluir: [],
};

type FilterSectionKey = "tipo" | "genero" | "tag" | "titulo";

function filtersEqual(a: ShuffleFilters, b: ShuffleFilters): boolean {
  return (
    JSON.stringify(a.tipo ?? []) === JSON.stringify(b.tipo ?? []) &&
    JSON.stringify(a.tipoExcluir ?? []) === JSON.stringify(b.tipoExcluir ?? []) &&
    JSON.stringify(a.genero ?? []) === JSON.stringify(b.genero ?? []) &&
    JSON.stringify(a.generoExcluir ?? []) === JSON.stringify(b.generoExcluir ?? []) &&
    JSON.stringify(a.tag ?? []) === JSON.stringify(b.tag ?? []) &&
    JSON.stringify(a.tagExcluir ?? []) === JSON.stringify(b.tagExcluir ?? []) &&
    JSON.stringify(a.estado ?? []) === JSON.stringify(b.estado ?? []) &&
    JSON.stringify(a.estadoExcluir ?? []) === JSON.stringify(b.estadoExcluir ?? []) &&
    JSON.stringify(a.itemId ?? []) === JSON.stringify(b.itemId ?? []) &&
    JSON.stringify(a.itemIdExcluir ?? []) === JSON.stringify(b.itemIdExcluir ?? [])
  );
}

function includesAny(values: string[] | undefined, selected: string[] | undefined): boolean {
  if (!selected?.length) return true;
  if (!values?.length) return false;
  return selected.some((value) => values.includes(value));
}

function excludesAll(values: string[] | undefined, excluded: string[] | undefined): boolean {
  if (!excluded?.length) return true;
  if (!values?.length) return true;
  return excluded.every((value) => !values.includes(value));
}

export default function Main() {
  const { logout, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [autoApply, setAutoApply] = useState(true);
  const [filters, setFilters] = useState<ShuffleFilters>({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] = useState<ShuffleFilters>({ ...emptyFilters });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [shuffleWinner, setShuffleWinner] = useState<Item | null>(null);
  const [shufflePlaying, setShufflePlaying] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");
  const [openFilterSections, setOpenFilterSections] = useState({
    tipo: true,
    genero: false,
    tag: false,
    titulo: false,
  });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      if (!isAuthenticated) return;
      try {
        const { preferences } = await getFilterPreferences();
        if (!active) return;
        setAutoApply(preferences.autoApply);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setPreferencesLoaded(true);
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoApply) setAppliedFilters({ ...filters });
  }, [autoApply, filters]);

  useEffect(() => {
    if (!isAuthenticated || !preferencesLoaded) return;

    const timeoutId = window.setTimeout(() => {
      void saveFilterPreferences({
        autoApply,
      }).catch((error) => {
        console.error(error);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [autoApply, isAuthenticated, preferencesLoaded]);

  const filtersForApi = useMemo(() => ({
    ...(appliedFilters.tipo?.length ? { tipo: appliedFilters.tipo } : {}),
    ...(appliedFilters.tipoExcluir?.length ? { tipoExcluir: appliedFilters.tipoExcluir } : {}),
    ...(appliedFilters.genero?.length ? { genero: appliedFilters.genero } : {}),
    ...(appliedFilters.generoExcluir?.length ? { generoExcluir: appliedFilters.generoExcluir } : {}),
    ...(appliedFilters.tag?.length ? { tag: appliedFilters.tag } : {}),
    ...(appliedFilters.tagExcluir?.length ? { tagExcluir: appliedFilters.tagExcluir } : {}),
    ...(appliedFilters.estado?.length ? { estado: appliedFilters.estado } : {}),
    ...(appliedFilters.itemId?.length ? { itemId: appliedFilters.itemId } : {}),
    ...(appliedFilters.itemIdExcluir?.length ? { itemIdExcluir: appliedFilters.itemIdExcluir } : {}),
  }), [appliedFilters]);

  const hasPendingFilters = useMemo(() => !filtersEqual(filters, appliedFilters), [filters, appliedFilters]);
  const applyFilters = useCallback(() => setAppliedFilters({ ...filters }), [filters]);

  const cycleTipo = (t: ItemTipo) => {
    setFilters((f) => {
      const inInclude = f.tipo?.includes(t) ?? false;
      const inExcluir = f.tipoExcluir?.includes(t) ?? false;
      if (inInclude) return { ...f, tipo: (f.tipo ?? []).filter((x) => x !== t), tipoExcluir: [...(f.tipoExcluir ?? []), t] };
      if (inExcluir) return { ...f, tipoExcluir: (f.tipoExcluir ?? []).filter((x) => x !== t) };
      return { ...f, tipo: [...(f.tipo ?? []), t] };
    });
  };
  const cycleGenero = (g: string) => {
    setFilters((f) => {
      const inInclude = f.genero?.includes(g) ?? false;
      const inExcluir = f.generoExcluir?.includes(g) ?? false;
      if (inInclude) return { ...f, genero: (f.genero ?? []).filter((x) => x !== g), generoExcluir: [...(f.generoExcluir ?? []), g] };
      if (inExcluir) return { ...f, generoExcluir: (f.generoExcluir ?? []).filter((x) => x !== g) };
      return { ...f, genero: [...(f.genero ?? []), g] };
    });
  };
  const cycleTag = (tag: string) => {
    setFilters((f) => {
      const inInclude = f.tag?.includes(tag) ?? false;
      const inExcluir = f.tagExcluir?.includes(tag) ?? false;
      if (inInclude) return { ...f, tag: (f.tag ?? []).filter((x) => x !== tag), tagExcluir: [...(f.tagExcluir ?? []), tag] };
      if (inExcluir) return { ...f, tagExcluir: (f.tagExcluir ?? []).filter((x) => x !== tag) };
      return { ...f, tag: [...(f.tag ?? []), tag] };
    });
  };
  const setItemFilterMode = (itemId: string, mode: "incluir" | "excluir" | "off") => {
    setFilters((current) => {
      const nextInclude = (current.itemId ?? []).filter((value) => value !== itemId);
      const nextExclude = (current.itemIdExcluir ?? []).filter((value) => value !== itemId);

      if (mode === "incluir") {
        nextInclude.push(itemId);
      } else if (mode === "excluir") {
        nextExclude.push(itemId);
      }

      return {
        ...current,
        itemId: nextInclude,
        itemIdExcluir: nextExclude,
      };
    });
  };
  const toggleStatusFilter = (status: WatchStatus) => {
    setFilters((current) => {
      const currentStatuses = current.estado ?? [];
      const isActive = currentStatuses.includes(status);
      const nextStatuses = isActive
        ? currentStatuses.filter((value) => value !== status)
        : [...currentStatuses, status];

      return {
        ...current,
        estado: nextStatuses,
      };
    });
  };
  const clearAllFilters = () => {
    setAutoApply(true);
    setTitleSearch("");
    setFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
  };
  const activeFilterCount =
    (filters.tipo?.length ?? 0) +
    (filters.tipoExcluir?.length ?? 0) +
    (filters.genero?.length ?? 0) +
    (filters.generoExcluir?.length ?? 0) +
    (filters.tag?.length ?? 0) +
    (filters.tagExcluir?.length ?? 0) +
    (filters.estado?.length ?? 0) +
    (filters.itemId?.length ?? 0) +
    (filters.itemIdExcluir?.length ?? 0);
  const tipoActiveCount = (filters.tipo?.length ?? 0) + (filters.tipoExcluir?.length ?? 0);
  const generoActiveCount = (filters.genero?.length ?? 0) + (filters.generoExcluir?.length ?? 0);
  const tagActiveCount = (filters.tag?.length ?? 0) + (filters.tagExcluir?.length ?? 0);
  const statusActiveCount = filters.estado?.length ?? 0;
  const titleActiveCount = (filters.itemId?.length ?? 0) + (filters.itemIdExcluir?.length ?? 0);
  const visibleGenreScopes = useMemo(() => getGenreGroupsForTypes(filters.tipo), [filters.tipo]);
  const visibleGenreOptions = useMemo(() => getVisibleGenreOptions(filters.tipo), [filters.tipo]);
  const genreOptionsByScope = useMemo(
    () => visibleGenreScopes.map((scope) => ({
      scope,
      title: GENRE_GROUP_LABELS[scope],
      items: visibleGenreOptions.filter((genre) => genre.scope === scope),
    })).filter((group) => group.items.length > 0),
    [visibleGenreOptions, visibleGenreScopes]
  );
  const toggleFilterSection = (section: FilterSectionKey) => {
    setOpenFilterSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["items", "paginated", filtersForApi],
    queryFn: ({ pageParam }) => getItemsPaginated(filtersForApi, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["items", "catalog", isAuthenticated],
    queryFn: () => getItems(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const availableTags = useMemo(() => {
    const sourceItems = catalogItems.filter((item) => {
      if (filters.estado?.length && !filters.estado.includes(item.estado)) return false;
      if (filters.tipo?.length && !filters.tipo.includes(item.tipo)) return false;
      if (filters.tipoExcluir?.length && filters.tipoExcluir.includes(item.tipo)) return false;
      if (filters.itemId?.length && !filters.itemId.includes(item.id)) return false;
      if (filters.itemIdExcluir?.length && filters.itemIdExcluir.includes(item.id)) return false;
      if (!includesAny(item.generos, filters.genero)) return false;
      if (!excludesAll(item.generos, filters.generoExcluir)) return false;
      return true;
    });

    const selectedTags = new Set([...(filters.tag ?? []), ...(filters.tagExcluir ?? [])]);
    const orderedTags = [...new Set(sourceItems.flatMap((item) => item.tags ?? []))];

    return orderedTags.sort((a, b) => {
      const aSelected = selectedTags.has(a) ? 1 : 0;
      const bSelected = selectedTags.has(b) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });
  }, [
    catalogItems,
    filters.estado,
    filters.genero,
    filters.generoExcluir,
    filters.itemId,
    filters.itemIdExcluir,
    filters.tag,
    filters.tagExcluir,
    filters.tipo,
    filters.tipoExcluir,
  ]);

  const selectedTitleItems = useMemo(() => {
    const selectedIds = new Set([...(filters.itemId ?? []), ...(filters.itemIdExcluir ?? [])]);
    return catalogItems
      .filter((item) => selectedIds.has(item.id))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" }));
  }, [catalogItems, filters.itemId, filters.itemIdExcluir]);

  const titleSearchResults = useMemo(() => {
    const query = titleSearch.trim().toLowerCase();
    if (!query) return [];

    return catalogItems
      .filter((item) => {
        const matchesText =
          item.titulo.toLowerCase().includes(query) ||
          (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query));

        if (!matchesText) return false;
        if (filters.tipo?.length && !filters.tipo.includes(item.tipo)) return false;
        if (filters.tipoExcluir?.length && filters.tipoExcluir.includes(item.tipo)) return false;
        if (filters.estado?.length && !filters.estado.includes(item.estado)) return false;
        if (!includesAny(item.generos, filters.genero)) return false;
        if (!excludesAll(item.generos, filters.generoExcluir)) return false;
        if (!includesAny(item.tags, filters.tag)) return false;
        if (!excludesAll(item.tags, filters.tagExcluir)) return false;
        return true;
      })
      .sort((a, b) => {
        const aMode = filters.itemId?.includes(a.id) ? 2 : filters.itemIdExcluir?.includes(a.id) ? 1 : 0;
        const bMode = filters.itemId?.includes(b.id) ? 2 : filters.itemIdExcluir?.includes(b.id) ? 1 : 0;
        if (aMode !== bMode) return bMode - aMode;
        return a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" });
      })
      .slice(0, 8);
  }, [
    catalogItems,
    filters.estado,
    filters.genero,
    filters.generoExcluir,
    filters.itemId,
    filters.itemIdExcluir,
    filters.tag,
    filters.tagExcluir,
    filters.tipo,
    filters.tipoExcluir,
    titleSearch,
  ]);

  const onScroll = useCallback(() => {
    const el = carouselScrollRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollLeft + clientWidth >= scrollWidth - SCROLL_LOAD_THRESHOLD) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = carouselScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll, items.length]);

  const runShuffle = async () => {
    setShufflePlaying(true);
    setShuffleWinner(null);
    try {
      const { item } = await shuffle(filtersForApi);
      setShuffleWinner(item);
      queryClient.invalidateQueries({ queryKey: ["items"] });
    } catch (e) {
      console.error(e);
    } finally {
      setShufflePlaying(false);
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    const el = carouselScrollRef.current;
    if (!el) return;
    const delta = (direction === "left" ? -1 : 1) * SCROLL_STEP * CARDS_PER_SCROLL;
    el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
  };

  return (
    <div className="main-layout">
      <header className="main-header">
        <div className="main-header-left">
          <div className="main-logo-box">
            <img
              src="/couch-pick-logo-blanco.svg"
              alt="Couch Pick"
              className="main-logo-image"
            />
          </div>
          <div className="main-brand-copy">
            <h1 className="main-app-name">Couch Pick</h1>
            <p className="main-item-count">{total === 1 ? "1 contenido" : `${total} contenidos`}</p>
          </div>
        </div>
        <nav className="main-nav">
          <button
            type="button"
            className={`nav-btn nav-btn-filtros ${filtersOpen ? "nav-btn-active" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <IconFilter className="nav-btn-icon" />
            Filtros
            {filtersOpen ? (
              <IconChevronUp className="nav-chevron" />
            ) : (
              <IconChevronDown className="nav-chevron" />
            )}
          </button>
          <Link to="/app/crud" className="nav-btn nav-btn-gestionar">
            <IconSettings className="nav-btn-icon" />
            Gestionar
          </Link>
        </nav>
        <button
          type="button"
          className="btn-ghost btn-ghost-icon nav-btn-logout"
          onClick={() => setLogoutDialogOpen(true)}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <IconLogOut className="nav-btn-icon" />
        </button>
      </header>

      <ConfirmDialog
        open={logoutDialogOpen}
        title="Cerrar sesión"
        description="Vas a salir de tu cuenta actual en Couch Pick."
        confirmLabel="Sí, cerrar sesión"
        tone="danger"
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={async () => {
          setLogoutDialogOpen(false);
          await logout();
        }}
      />

      {/* Panel de filtros avanzados: incluir/excluir por categoría */}
      <div
        className={`main-filters-wrap ${filtersOpen ? "main-filters-wrap-open" : ""}`}
      >
        <form className="filters-panel" onSubmit={(e) => e.preventDefault()} aria-label="Filtros de contenido">
          <div className="filters-topbar">
            <div className="filters-topbar-copy">
              <h2 className="filters-main-title">Afina tu shuffle</h2>
              <p className="filters-main-subtitle">
                Ajusta lo que quieres incluir o excluir para que la recomendación se sienta mucho más precisa.
              </p>
            </div>
            {!autoApply && hasPendingFilters && (
              <button type="button" className="btn-aplicar-filtros" onClick={applyFilters}>
                Aplicar filtros
              </button>
            )}
          </div>

          <div className="filters-switch-grid">
            <label className={`filter-switch-card ${autoApply ? "filter-switch-card-on" : ""}`}>
              <span className="filter-switch-copy">
                <span className="filter-switch-title">Búsqueda automática</span>
                <span className="filter-switch-description">Aplica los cambios al momento mientras ajustas filtros.</span>
              </span>
              <span className="filter-switch-control">
                <input
                  type="checkbox"
                  className="filter-switch-input"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                />
                <span className="filter-switch-track" aria-hidden>
                  <span className="filter-switch-thumb" />
                </span>
              </span>
            </label>

            <div className={`filter-switch-card filter-status-card ${statusActiveCount > 0 ? "filter-switch-card-on" : ""}`}>
              <span className="filter-switch-copy">
                <span className="filter-switch-title">Estado del progreso</span>
                <span className="filter-switch-description">Combina no vistos, viendo y vistos; si no eliges ninguno, entran todos.</span>
              </span>
              <div className="filter-status-buttons">
                <button
                  type="button"
                  className={`filter-status-btn ${statusActiveCount === 0 ? "filter-status-btn-active" : ""}`}
                  onClick={() => setFilters((current) => ({ ...current, estado: [] }))}
                >
                  Todos
                </button>
                {STATUS_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-status-btn ${filters.estado?.includes(value) ? "filter-status-btn-active" : ""}`}
                    onClick={() => toggleStatusFilter(value)}
                  >
                    <Icon className="filter-status-btn-icon" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="filters-legend">
            <span className="filters-legend-label">Estados:</span>
            <span className="filters-legend-chip filters-legend-chip-off">Sin filtro</span>
            <span className="filters-legend-chip filters-legend-chip-incluir">Incluir</span>
            <span className="filters-legend-chip filters-legend-chip-excluir">Excluir</span>
          </div>
          <p className="filters-guide-text">
            Toca un chip varias veces para alternar entre incluir, excluir y desactivar. Usa los acordeones para mantener el panel compacto.
          </p>

          <div className="filters-panel-block filters-panel-card">
            <div className="filters-card-header">
              <button
                type="button"
                className="filters-accordion-trigger"
                onClick={() => toggleFilterSection("tipo")}
                aria-expanded={openFilterSections.tipo}
              >
                <div className="filters-accordion-copy">
                  <span className="filters-panel-title">Tipo</span>
                  <span className="filters-panel-hint">Define qué formatos entran o quedan fuera del shuffle.</span>
                </div>
                <div className="filters-accordion-meta">
                  {tipoActiveCount > 0 && (
                    <span className="filters-count-badge">
                      {tipoActiveCount} activo{tipoActiveCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {tipoActiveCount > 0 && (
                    <button
                      type="button"
                      className="filters-inline-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((f) => ({ ...f, tipo: [], tipoExcluir: [] }));
                      }}
                      aria-label="Limpiar filtro de tipo"
                      title="Limpiar tipo"
                    >
                      <IconTrash2 className="filters-limpiar-icon" />
                      Limpiar
                    </button>
                  )}
                  {openFilterSections.tipo ? <IconChevronUp className="filters-accordion-icon" /> : <IconChevronDown className="filters-accordion-icon" />}
                </div>
              </button>
            </div>
            {openFilterSections.tipo && (
              <>
                <div className="filters-type-wrap">
                  {TIPOS.map((t) => {
                    const Icon = TYPE_ICONS[t];
                    const mode = filters.tipo?.includes(t) ? "incluir" : filters.tipoExcluir?.includes(t) ? "excluir" : "off";
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => cycleTipo(t)}
                        className={`filter-type-btn filter-chip filter-chip-${mode} ${mode === "off" ? "filter-type-btn-unselected" : ""}`}
                        title={mode === "incluir" ? "Incluir: mostrar solo este tipo" : mode === "excluir" ? "Excluir: no mostrar este tipo" : "Clic para incluir"}
                      >
                        <Icon className="filter-type-icon" />
                        <span>{MEDIA_TYPE_LABELS[t]}</span>
                        {mode === "incluir" && <span className="filter-chip-badge filter-chip-badge-incluir">Incluir</span>}
                        {mode === "excluir" && <span className="filter-chip-badge filter-chip-badge-excluir">Excluir</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="filters-panel-block filters-panel-card">
            <div className="filters-card-header">
              <button
                type="button"
                className="filters-accordion-trigger"
                onClick={() => toggleFilterSection("genero")}
                aria-expanded={openFilterSections.genero}
              >
                <div className="filters-accordion-copy">
                  <span className="filters-panel-title">Géneros</span>
                  <span className="filters-panel-hint">Separados por comunes, anime y película/serie para que filtres con más contexto.</span>
                </div>
                <div className="filters-accordion-meta">
                  {generoActiveCount > 0 && (
                    <span className="filters-count-badge">
                      {generoActiveCount} activo{generoActiveCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {generoActiveCount > 0 && (
                    <button
                      type="button"
                      className="filters-inline-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((f) => ({ ...f, genero: [], generoExcluir: [] }));
                      }}
                      aria-label="Limpiar filtro de géneros"
                      title="Limpiar géneros"
                    >
                      <IconTrash2 className="filters-limpiar-icon" />
                      Limpiar
                    </button>
                  )}
                  {openFilterSections.genero ? <IconChevronUp className="filters-accordion-icon" /> : <IconChevronDown className="filters-accordion-icon" />}
                </div>
              </button>
            </div>
            {openFilterSections.genero && (
              <>
                {genreOptionsByScope.length > 0 ? (
                  <div className="filters-genre-groups">
                    {genreOptionsByScope.map((group) => (
                      <div key={group.scope} className="filters-genre-group">
                        <div className="filters-genre-group-title">{group.title}</div>
                        <div className="filters-type-wrap">
                          {group.items.map((genre) => {
                            const mode = filters.genero?.includes(genre.label) ? "incluir" : filters.generoExcluir?.includes(genre.label) ? "excluir" : "off";
                            return (
                              <button
                                key={genre.label}
                                type="button"
                                onClick={() => cycleGenero(genre.label)}
                                className={`filter-type-btn filter-chip filter-chip-${mode} ${mode === "off" ? "filter-type-btn-unselected" : ""}`}
                                title={mode === "incluir" ? "Incluir: al menos uno" : mode === "excluir" ? "Excluir: ninguno" : "Clic para incluir"}
                              >
                                <span>{genre.label}</span>
                                {mode === "incluir" && <span className="filter-chip-badge filter-chip-badge-incluir">Incluir</span>}
                                {mode === "excluir" && <span className="filter-chip-badge filter-chip-badge-excluir">Excluir</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="filters-panel-hint">Con el tipo activo actual no hay géneros aplicables para filtrar.</p>
                )}
              </>
            )}
          </div>

          <div className="filters-panel-block filters-panel-card">
            <div className="filters-card-header">
              <button
                type="button"
                className="filters-accordion-trigger"
                onClick={() => toggleFilterSection("titulo")}
                aria-expanded={openFilterSections.titulo}
              >
                <div className="filters-accordion-copy">
                  <span className="filters-panel-title">Títulos</span>
                  <span className="filters-panel-hint">Arma un shuffle manual incluyendo o descartando títulos concretos desde tu catálogo.</span>
                </div>
                <div className="filters-accordion-meta">
                  {titleActiveCount > 0 && (
                    <span className="filters-count-badge">
                      {titleActiveCount} activo{titleActiveCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {titleActiveCount > 0 && (
                    <button
                      type="button"
                      className="filters-inline-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((current) => ({ ...current, itemId: [], itemIdExcluir: [] }));
                      }}
                      aria-label="Limpiar filtro de títulos"
                      title="Limpiar títulos"
                    >
                      <IconTrash2 className="filters-limpiar-icon" />
                      Limpiar
                    </button>
                  )}
                  {openFilterSections.titulo ? <IconChevronUp className="filters-accordion-icon" /> : <IconChevronDown className="filters-accordion-icon" />}
                </div>
              </button>
            </div>
            {openFilterSections.titulo && (
              <div className="title-filter-panel">
                <div className="title-filter-search">
                  <IconSearch className="title-filter-search-icon" />
                  <input
                    type="search"
                    className="title-filter-search-input"
                    placeholder="Busca un título o tag..."
                    value={titleSearch}
                    onChange={(event) => setTitleSearch(event.target.value)}
                  />
                </div>

                {selectedTitleItems.length > 0 && (
                  <div className="title-filter-selected">
                    {selectedTitleItems.map((item) => {
                      const mode = filters.itemId?.includes(item.id)
                        ? "incluir"
                        : filters.itemIdExcluir?.includes(item.id)
                          ? "excluir"
                          : "off";

                      return (
                        <div key={item.id} className={`title-filter-selected-card title-filter-selected-card-${mode}`}>
                          <div className="title-filter-selected-copy">
                            <span className="title-filter-selected-title">{item.titulo}</span>
                            <span className="title-filter-selected-meta">
                              {MEDIA_TYPE_LABELS[item.tipo]}{item.generos?.[0] ? ` · ${item.generos[0]}` : ""}
                            </span>
                          </div>
                          <div className="title-filter-selected-actions">
                            <span className={`title-filter-mode-pill title-filter-mode-pill-${mode}`}>
                              {mode === "incluir" ? "Solo sí" : "Excluir"}
                            </span>
                            <button
                              type="button"
                              className="title-filter-remove-btn"
                              onClick={() => setItemFilterMode(item.id, "off")}
                              aria-label={`Quitar ${item.titulo} de la selección manual`}
                            >
                              <IconX className="title-filter-remove-icon" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {titleSearch.trim() ? (
                  titleSearchResults.length > 0 ? (
                    <div className="title-filter-results">
                      {titleSearchResults.map((item) => {
                        const isIncluded = filters.itemId?.includes(item.id) ?? false;
                        const isExcluded = filters.itemIdExcluir?.includes(item.id) ?? false;

                        return (
                          <div key={item.id} className="title-filter-result-card">
                            <div className="title-filter-result-copy">
                              <span className="title-filter-result-title">{item.titulo}</span>
                              <span className="title-filter-result-meta">
                                {MEDIA_TYPE_LABELS[item.tipo]}
                                {item.estado === "watching"
                                  ? " · Viendo"
                                  : item.estado === "watched"
                                    ? " · Visto"
                                    : " · No visto"}
                              </span>
                            </div>
                            <div className="title-filter-result-actions">
                              <button
                                type="button"
                                className={`title-filter-action title-filter-action-include ${isIncluded ? "title-filter-action-active" : ""}`}
                                onClick={() => setItemFilterMode(item.id, isIncluded ? "off" : "incluir")}
                              >
                                <IconPlus className="title-filter-action-icon" />
                                Incluir
                              </button>
                              <button
                                type="button"
                                className={`title-filter-action title-filter-action-exclude ${isExcluded ? "title-filter-action-active" : ""}`}
                                onClick={() => setItemFilterMode(item.id, isExcluded ? "off" : "excluir")}
                              >
                                <IconX className="title-filter-action-icon" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="filters-panel-hint">No encontramos títulos que encajen con esa búsqueda y tus filtros actuales.</p>
                  )
                ) : (
                  <p className="filters-panel-hint">Empieza escribiendo para sumar títulos concretos al shuffle o sacarlos de la mezcla.</p>
                )}
              </div>
            )}
          </div>

          {availableTags.length > 0 && (
            <div className="filters-panel-block filters-panel-card">
              <div className="filters-card-header">
                <button
                  type="button"
                  className="filters-accordion-trigger"
                  onClick={() => toggleFilterSection("tag")}
                  aria-expanded={openFilterSections.tag}
                >
                  <div className="filters-accordion-copy">
                    <span className="filters-panel-title">Tags</span>
                    <span className="filters-panel-hint">Refina por saga, año, nota o cualquier detalle que hayas guardado.</span>
                  </div>
                  <div className="filters-accordion-meta">
                    {tagActiveCount > 0 && (
                      <span className="filters-count-badge">
                        {tagActiveCount} activo{tagActiveCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {tagActiveCount > 0 && (
                      <button
                        type="button"
                        className="filters-inline-clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilters((f) => ({ ...f, tag: [], tagExcluir: [] }));
                        }}
                        aria-label="Limpiar filtro de tags"
                        title="Limpiar tags"
                      >
                        <IconTrash2 className="filters-limpiar-icon" />
                        Limpiar
                      </button>
                    )}
                    {openFilterSections.tag ? <IconChevronUp className="filters-accordion-icon" /> : <IconChevronDown className="filters-accordion-icon" />}
                  </div>
                </button>
              </div>
              {openFilterSections.tag && (
                <>
                  <div className="filters-type-wrap filters-tags-wrap">
                    {availableTags.slice(0, 14).map((tag) => {
                      const mode = filters.tag?.includes(tag) ? "incluir" : filters.tagExcluir?.includes(tag) ? "excluir" : "off";
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => cycleTag(tag)}
                          className={`filter-type-btn filter-tag-btn filter-chip filter-chip-${mode} ${mode === "off" ? "filter-type-btn-unselected" : ""}`}
                          title={mode === "incluir" ? "Incluir" : mode === "excluir" ? "Excluir" : "Clic para incluir"}
                        >
                          #{tag}
                          {mode === "incluir" && <span className="filter-chip-badge filter-chip-badge-incluir">+</span>}
                          {mode === "excluir" && <span className="filter-chip-badge filter-chip-badge-excluir">Excluir</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="filters-panel-block filters-panel-footer">
            <div className="filters-summary-card">
              <div className="filters-summary-badge">
                {activeFilterCount > 0 ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"}` : "Shuffle libre"}
              </div>
              <div className="filters-footer-copy">
                <span className="filters-footer-title">
                  {activeFilterCount > 0 ? "Tu shuffle ya tiene dirección" : "Tu shuffle está abierto a todo"}
                </span>
                <span className="filters-footer-description">
                  {activeFilterCount > 0
                    ? "La próxima recomendación respetará tus preferencias activas."
                    : "No hay restricciones aplicadas, así que cualquier contenido de tu catálogo puede aparecer."}
                </span>
              </div>
              {activeFilterCount > 0 && (
                <button type="button" className="filters-action-pill filters-action-pill-danger" onClick={clearAllFilters} title="Limpiar todos los filtros">
                  <IconShuffle className="filters-limpiar-icon" />
                  Reiniciar filtros
                </button>
              )}
            </div>
          </div>

          {!autoApply && hasPendingFilters && (
            <div className="filters-mobile-actions">
              <button type="button" className="btn-aplicar-filtros filters-mobile-apply" onClick={applyFilters}>
                Aplicar filtros
              </button>
            </div>
          )}
        </form>
      </div>

      <main className="main-content">
        <section className="shuffle-cta">
          <p className="shuffle-kicker">QUE VEMOS ESTA NOCHE?</p>
          <motion.button
            type="button"
            className={`btn-shuffle-circle ${shufflePlaying ? "btn-shuffle-circle-active" : ""}`}
            onClick={runShuffle}
            disabled={shufflePlaying || total < 2}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {!shufflePlaying && total >= 2 && (
              <span className="btn-shuffle-ring" aria-hidden />
            )}
            <div className="btn-shuffle-inner">
              <img
                src="/shuffle-icon.png"
                alt=""
                className={`shuffle-icon-img ${shufflePlaying ? "shuffle-icon-spin" : ""}`}
              />
              <span className="shuffle-label">
                {shufflePlaying ? "Eligiendo..." : "SHUFFLE"}
              </span>
            </div>
          </motion.button>
          <p className="shuffle-item-count">
            {total < 2
              ? "Necesitas al menos 2 contenidos para shufflear"
              : total === 1
                ? "1 contenido disponible"
                : `${total} contenidos disponibles`}
          </p>
          <p className="shuffle-caption">Deja que Couch Pick te saque de la indecisión.</p>
          {total === 0 && !isLoading && (
            <p className="shuffle-hint">Añade contenido en Gestionar para usar el shuffle.</p>
          )}
        </section>

        <AnimatePresence mode="wait">
          {shuffleWinner && (
            <ShuffleAnimation
              key={shuffleWinner.id}
              item={shuffleWinner}
              items={items}
              onClose={() => setShuffleWinner(null)}
              onAdvanceStatus={async () => {
                await updateItem(shuffleWinner.id, { estado: getNextWatchStatus(shuffleWinner.estado) });
                queryClient.invalidateQueries({ queryKey: ["items"] });
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedItem && (
            <ItemDetailModal
              key={selectedItem.id}
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onAdvanceStatus={async () => {
                await updateItem(selectedItem.id, { estado: getNextWatchStatus(selectedItem.estado) });
                queryClient.invalidateQueries({ queryKey: ["items"] });
                setSelectedItem(null);
              }}
            />
          )}
        </AnimatePresence>

        <section className="cards-section">
          <div className="cards-section-head">
            <div className="cards-section-copy">
              <h2 className="section-title">Contenidos disponibles</h2>
              <p className="section-subtitle">Desliza para explorar tu colección y abre cualquier card para ver más detalle.</p>
            </div>
            {items.length > 0 && total > 0 && (
              <div className="cards-nav" aria-label="Navegación del carrusel">
                <button
                  type="button"
                  className="cards-nav-btn"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Anterior"
                >
                  <IconArrowLeft className="cards-nav-icon" />
                </button>
                <button
                  type="button"
                  className="cards-nav-btn"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Siguiente"
                >
                  <IconArrowRight className="cards-nav-icon" />
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="cards-skeleton-h">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card-skeleton-h" />
              ))}
            </div>
          ) : (
            <div className="cards-scroll-container">
              <div className="cards-scroll-gradient cards-scroll-gradient-left" aria-hidden />
              <div className="cards-scroll-gradient cards-scroll-gradient-right" aria-hidden />
              <div ref={carouselScrollRef} className="cards-scroll-wrap" role="region" aria-label="Carrusel de contenidos">
                <motion.ul className="cards-grid-h" layout>
                  {items.map((it) => (
                    <motion.li
                      key={it.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ItemCard
                        item={it}
                        showEye
                        onClick={() => setSelectedItem(it)}
                        onToggleVisto={async () => {
                          await updateItem(it.id, { estado: getNextWatchStatus(it.estado) });
                          queryClient.invalidateQueries({ queryKey: ["items"] });
                        }}
                      />
                    </motion.li>
                  ))}
                </motion.ul>
                {isFetchingNextPage && (
                  <div className="cards-skeleton-inline" aria-hidden aria-busy="true">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={`skeleton-${i}`} className="card-skeleton-h" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {!isLoading && total === 0 && (
            <p className="empty-state">No hay contenido. <Link to="/app/crud">Añadir en Gestionar</Link></p>
          )}
        </section>
      </main>
    </div>
  );
}
