import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getItemsPaginated, shuffle, updateItem, type Item, type ItemTipo, type ShuffleFilters } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import {
  IconFilm,
  IconTv,
  IconPlay,
  IconYoutube,
  IconX,
  IconSettings,
  IconChevronUp,
  IconChevronDown,
  IconSparkles,
  IconShuffle,
  IconLogOut,
} from "../components/icons";
import ItemCard from "../components/ItemCard";
import ItemDetailModal from "../components/ItemDetailModal";
import ShuffleAnimation from "../components/ShuffleAnimation";
import { GENRE_OPTIONS } from "../lib/constants";
import "./Main.css";

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;
const CARDS_PER_SCROLL = 3;
const PAGE_SIZE = 24;
const SCROLL_LOAD_THRESHOLD = 400;

const TIPOS: ItemTipo[] = ["movie", "series", "anime", "youtube"];
const TYPE_ICONS = { movie: IconFilm, series: IconTv, anime: IconPlay, youtube: IconYoutube };
const AUTO_APPLY_STORAGE_KEY = "couchpick-auto-apply-filters";

const emptyFilters: ShuffleFilters = {
  tipo: [],
  tipoExcluir: [],
  genero: [],
  generoExcluir: [],
  tag: [],
  tagExcluir: [],
};

function filtersEqual(a: ShuffleFilters, b: ShuffleFilters): boolean {
  return (
    JSON.stringify(a.tipo ?? []) === JSON.stringify(b.tipo ?? []) &&
    JSON.stringify(a.tipoExcluir ?? []) === JSON.stringify(b.tipoExcluir ?? []) &&
    JSON.stringify(a.genero ?? []) === JSON.stringify(b.genero ?? []) &&
    JSON.stringify(a.generoExcluir ?? []) === JSON.stringify(b.generoExcluir ?? []) &&
    JSON.stringify(a.tag ?? []) === JSON.stringify(b.tag ?? []) &&
    JSON.stringify(a.tagExcluir ?? []) === JSON.stringify(b.tagExcluir ?? []) &&
    (a.soloNoVistos ?? false) === (b.soloNoVistos ?? false)
  );
}

export default function Main() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [autoApply, setAutoApply] = useState(() => {
    try {
      return localStorage.getItem(AUTO_APPLY_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [filters, setFilters] = useState<ShuffleFilters>({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] = useState<ShuffleFilters>({ ...emptyFilters });
  const [shuffleWinner, setShuffleWinner] = useState<Item | null>(null);
  const [shufflePlaying, setShufflePlaying] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_APPLY_STORAGE_KEY, String(autoApply));
    } catch {}
  }, [autoApply]);

  useEffect(() => {
    if (autoApply) setAppliedFilters({ ...filters });
  }, [autoApply, filters]);

  const filtersForApi = useMemo(() => ({
    ...(appliedFilters.tipo?.length ? { tipo: appliedFilters.tipo } : {}),
    ...(appliedFilters.tipoExcluir?.length ? { tipoExcluir: appliedFilters.tipoExcluir } : {}),
    ...(appliedFilters.genero?.length ? { genero: appliedFilters.genero } : {}),
    ...(appliedFilters.generoExcluir?.length ? { generoExcluir: appliedFilters.generoExcluir } : {}),
    ...(appliedFilters.tag?.length ? { tag: appliedFilters.tag } : {}),
    ...(appliedFilters.tagExcluir?.length ? { tagExcluir: appliedFilters.tagExcluir } : {}),
    ...(appliedFilters.soloNoVistos ? { soloNoVistos: true } : {}),
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
  const clearAllFilters = () => {
    setFilters({ ...emptyFilters });
  };
  const hasAnyFilter = (filters.tipo?.length ?? 0) + (filters.tipoExcluir?.length ?? 0) + (filters.genero?.length ?? 0) + (filters.generoExcluir?.length ?? 0) + (filters.tag?.length ?? 0) + (filters.tagExcluir?.length ?? 0) > 0;

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

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const availableTags = useMemo(
    () => [...new Set(items.flatMap((i) => i.tags ?? []))],
    [items]
  );

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
            <IconSparkles className="main-logo-icon" />
          </div>
          <div>
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
            <IconSettings className="nav-btn-icon" />
            Filtros
            {filtersOpen ? (
              <IconChevronUp className="nav-chevron" />
            ) : (
              <IconChevronDown className="nav-chevron" />
            )}
          </button>
          <Link to="/app/crud" className="nav-btn nav-btn-gestionar">
            Gestionar
          </Link>
          <button type="button" className="btn-ghost btn-ghost-icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <IconLogOut className="nav-btn-icon" />
          </button>
        </nav>
      </header>

      {/* Panel de filtros avanzados: Incluir (OR) / Excluir por categoría */}
      <div
        className={`main-filters-wrap ${filtersOpen ? "main-filters-wrap-open" : ""}`}
      >
        <form className="filters-panel" onSubmit={(e) => e.preventDefault()} aria-label="Filtros de contenido">
          <div className="filters-panel-block filters-panel-block-inline">
            <label className="filter-check">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(e) => setAutoApply(e.target.checked)}
              />
              Búsqueda automática
            </label>
            {!autoApply && hasPendingFilters && (
              <button type="button" className="btn-aplicar-filtros" onClick={applyFilters}>
                Aplicar filtros
              </button>
            )}
          </div>

          <div className="filters-panel-block">
            <div className="filters-panel-header">
              <h3 className="filters-panel-title">Tipo</h3>
              {((filters.tipo?.length ?? 0) + (filters.tipoExcluir?.length ?? 0)) > 0 && (
                <button
                  type="button"
                  className="filters-limpiar"
                  onClick={() => setFilters((f) => ({ ...f, tipo: [], tipoExcluir: [] }))}
                  title="Limpiar tipo"
                >
                  <IconX className="filters-limpiar-icon" />
                  Limpiar
                </button>
              )}
            </div>
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
          </div>

          <div className="filters-panel-block">
            <div className="filters-panel-header">
              <h3 className="filters-panel-title">Géneros</h3>
              {((filters.genero?.length ?? 0) + (filters.generoExcluir?.length ?? 0)) > 0 && (
                <button
                  type="button"
                  className="filters-limpiar"
                  onClick={() => setFilters((f) => ({ ...f, genero: [], generoExcluir: [] }))}
                  title="Limpiar géneros"
                >
                  <IconX className="filters-limpiar-icon" />
                  Limpiar
                </button>
              )}
            </div>
            <div className="filters-type-wrap">
              {GENRE_OPTIONS.map((g) => {
                const mode = filters.genero?.includes(g) ? "incluir" : filters.generoExcluir?.includes(g) ? "excluir" : "off";
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => cycleGenero(g)}
                    className={`filter-type-btn filter-chip filter-chip-${mode} ${mode === "off" ? "filter-type-btn-unselected" : ""}`}
                    title={mode === "incluir" ? "Incluir: al menos uno" : mode === "excluir" ? "Excluir: ninguno" : "Clic para incluir"}
                  >
                    <span>{g}</span>
                    {mode === "incluir" && <span className="filter-chip-badge filter-chip-badge-incluir">Incluir</span>}
                    {mode === "excluir" && <span className="filter-chip-badge filter-chip-badge-excluir">Excluir</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className="filters-panel-block">
              <div className="filters-panel-header">
                <h3 className="filters-panel-title">Tags</h3>
                {((filters.tag?.length ?? 0) + (filters.tagExcluir?.length ?? 0)) > 0 && (
                  <button
                    type="button"
                    className="filters-limpiar"
                    onClick={() => setFilters((f) => ({ ...f, tag: [], tagExcluir: [] }))}
                    title="Limpiar tags"
                  >
                    <IconX className="filters-limpiar-icon" />
                    Limpiar
                  </button>
                )}
              </div>
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
                      {mode === "excluir" && <span className="filter-chip-badge filter-chip-badge-excluir">−</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="filters-panel-block filters-panel-block-inline filters-panel-footer">
            <label className="filter-check">
              <input
                type="checkbox"
                checked={filters.soloNoVistos ?? false}
                onChange={(e) => setFilters((f) => ({ ...f, soloNoVistos: e.target.checked || undefined }))}
              />
              Solo no vistos
            </label>
            {filters.soloNoVistos && (
              <button
                type="button"
                className="filters-limpiar"
                onClick={() => setFilters((f) => ({ ...f, soloNoVistos: undefined }))}
                title="Quitar solo no vistos"
              >
                <IconX className="filters-limpiar-icon" />
                Limpiar
              </button>
            )}
            {hasAnyFilter && (
              <button type="button" className="filters-limpiar filters-limpiar-todo" onClick={clearAllFilters} title="Limpiar todos los filtros">
                <IconX className="filters-limpiar-icon" />
                Limpiar todo
              </button>
            )}
          </div>
        </form>
      </div>

      <main className="main-content">
        <section className="shuffle-cta">
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
              <IconShuffle className={`shuffle-icon-svg ${shufflePlaying ? "shuffle-icon-spin" : ""}`} />
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
              onMarkWatched={async () => {
                await updateItem(shuffleWinner.id, { visto: true });
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
              onMarkWatched={async () => {
                await updateItem(selectedItem.id, { visto: true });
                queryClient.invalidateQueries({ queryKey: ["items"] });
                setSelectedItem(null);
              }}
            />
          )}
        </AnimatePresence>

        <section className="cards-section">
          <h2 className="section-title">Contenidos disponibles</h2>
          {isLoading ? (
            <div className="cards-skeleton-h">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card-skeleton-h" />
              ))}
            </div>
          ) : (
            <div className="cards-scroll-container">
              {items.length > 0 && total > 0 && (
                <>
                  <button
                    type="button"
                    className="cards-scroll-arrow cards-scroll-arrow-left"
                    onClick={() => scrollCarousel("left")}
                    aria-label="Anterior"
                  >
                    <span className="cards-scroll-chevron" aria-hidden>&lt;</span>
                  </button>
                  <button
                    type="button"
                    className="cards-scroll-arrow cards-scroll-arrow-right"
                    onClick={() => scrollCarousel("right")}
                    aria-label="Siguiente"
                  >
                    <span className="cards-scroll-chevron" aria-hidden>&gt;</span>
                  </button>
                </>
              )}
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
                          await updateItem(it.id, { visto: !it.visto });
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
