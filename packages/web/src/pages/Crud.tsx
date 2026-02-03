import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  getItems,
  updateItem,
  deleteItem,
  exportBackup,
  importBackup,
  type Item,
  type ItemTipo,
} from "../api/items";
import ItemForm from "../components/ItemForm";
import ManageCard from "../components/ManageCard";
import {
  IconX,
  IconSearch,
  IconFilter,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconSparkles,
  IconDownload,
  IconUpload,
  IconLogOut,
} from "../components/icons";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS, GENRE_OPTIONS } from "../lib/constants";
import "./Crud.css";
import "./Main.css";

const TIPOS: ItemTipo[] = ["movie", "series", "anime", "youtube"];
type EstadoFilter = "all" | "watched" | "unwatched";

export default function Crud() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [tipoFilters, setTipoFilters] = useState<ItemTipo[]>([]);
  const [generoFilters, setGeneroFilters] = useState<string[]>([]);
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    try {
      const list = await exportBackup();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `couchpick-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error al exportar. Revisa la consola.");
    }
  }, []);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const text = ev.target?.result as string;
          const list = JSON.parse(text) as Item[];
          if (!Array.isArray(list)) throw new Error("El archivo debe ser un array JSON.");
          const { imported } = await importBackup(list);
          queryClient.invalidateQueries({ queryKey: ["items"] });
          alert(`Importados ${imported} ítems. La base anterior fue reemplazada.`);
        } catch (err) {
          console.error(err);
          alert("Error al importar. Revisa que el archivo sea un backup JSON válido.");
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    },
    [queryClient]
  );

  const filters = useMemo(() => {
    const f: { tipo?: ItemTipo[]; visto?: boolean; genero?: string[] } = {};
    if (tipoFilters.length > 0) f.tipo = tipoFilters;
    if (estadoFilter === "watched") f.visto = true;
    if (estadoFilter === "unwatched") f.visto = false;
    if (generoFilters.length > 0) f.genero = generoFilters;
    return f;
  }, [tipoFilters, estadoFilter, generoFilters]);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => getItems(filters),
  });

  const hasActiveFilters =
    tipoFilters.length > 0 ||
    generoFilters.length > 0 ||
    estadoFilter !== "all" ||
    search.trim() !== "";
  const activeFiltersCount =
    (tipoFilters.length ? 1 : 0) +
    (generoFilters.length ? 1 : 0) +
    (estadoFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);
  const clearAllFilters = () => {
    setTipoFilters([]);
    setGeneroFilters([]);
    setEstadoFilter("all");
    setSearch("");
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.titulo.toLowerCase().includes(q) ||
        (i.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  const existingTags = useMemo(
    () => [...new Set(items.flatMap((i) => i.tags ?? []))],
    [items]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateItem>[1] }) =>
      updateItem(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setEditing(null);
    },
  });

  const toggleVisto = (item: Item) => {
    updateMutation.mutate({ id: item.id, body: { visto: !item.visto } });
  };

  const showModal = creating || editing;

  return (
    <main className="crud-layout">
      <header className="crud-header">
        <div className="crud-header-left">
          <button
            type="button"
            className="crud-back"
            onClick={() => navigate("/app")}
            aria-label="Volver"
          >
            <IconArrowLeft className="crud-back-icon" />
          </button>
          <div className="crud-logo-box">
            <IconSparkles className="crud-logo-icon" />
          </div>
          <div>
            <h1 className="crud-title">Gestionar Contenido</h1>
            <p className="crud-item-count">{filteredItems.length} de {items.length} {items.length === 1 ? "contenido" : "contenidos"}</p>
          </div>
        </div>
        <div className="crud-header-right">
        <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/app")}
            title="Volver a Shuffle"
          >
            Shuffle
          </button>
          <button
            type="button"
            className="nav-btn"
            onClick={handleExport}
            title="Exportar respaldo (JSON)"
          >
            <IconDownload className="nav-btn-icon" />
            Exportar
          </button>
          <button
            type="button"
            className="nav-btn"
            onClick={() => importInputRef.current?.click()}
            title="Importar respaldo (reemplaza toda la BD)"
          >
            <IconUpload className="nav-btn-icon" />
            Importar
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="crud-import-input"
            aria-hidden
            onChange={handleImport}
          />
          <button
            type="button"
            className="btn-agregar"
            onClick={() => { setCreating(true); setEditing(null); }}
          >
            <IconPlus className="btn-agregar-icon" />
            Agregar
          </button>
    
          <button type="button" className="btn-ghost btn-ghost-icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <IconLogOut className="nav-btn-icon" />
          </button>
        </div>
      </header>

      {/* Search and filters bar (referencia: border-b border-border/50 bg-card/30) */}
      <div className="crud-toolbar-bar">
        <div className="crud-toolbar-inner">
          <div className="crud-toolbar">
          <div className="crud-search-wrap">
            <IconSearch className="crud-search-icon" aria-hidden />
            <input
              type="search"
              className="crud-search"
              placeholder="Buscar por título o tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`nav-btn ${filtersOpen ? "nav-btn-active" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <IconFilter className="nav-btn-icon" />
            Filtros
            {hasActiveFilters && (
              <span className="crud-filters-badge">{activeFiltersCount}</span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="filters-limpiar"
              onClick={clearAllFilters}
              title="Limpiar todos los filtros"
            >
              <IconX className="filters-limpiar-icon" />
              Limpiar todo
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="crud-filters-panel">
            <div className="crud-filters-block">
              <div className="crud-filters-block-header">
                <h4 className="crud-filters-label">Tipo</h4>
                {tipoFilters.length > 0 && (
                  <button
                    type="button"
                    className="filters-limpiar"
                    onClick={() => setTipoFilters([])}
                    title="Limpiar tipo"
                  >
                    <IconX className="filters-limpiar-icon" />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="crud-filters-chips">
                {TIPOS.map((t) => {
                  const isSelected = tipoFilters.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTipoFilters((prev) =>
                          isSelected ? prev.filter((x) => x !== t) : [...prev, t]
                        )
                      }
                      className={`filter-type-btn ${isSelected ? MEDIA_TYPE_COLORS[t] : "filter-type-btn-unselected"}`}
                    >
                      {MEDIA_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="crud-filters-block">
              <div className="crud-filters-block-header">
                <h4 className="crud-filters-label">Géneros</h4>
                {generoFilters.length > 0 && (
                  <button
                    type="button"
                    className="filters-limpiar"
                    onClick={() => setGeneroFilters([])}
                    title="Limpiar géneros"
                  >
                    <IconX className="filters-limpiar-icon" />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="crud-filters-chips">
                {GENRE_OPTIONS.map((g) => {
                  const isSelected = generoFilters.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setGeneroFilters((prev) =>
                          isSelected ? prev.filter((x) => x !== g) : [...prev, g]
                        )
                      }
                      className={`filter-type-btn ${isSelected ? "filter-type-btn-selected" : "filter-type-btn-unselected"}`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="crud-filters-block">
              <div className="crud-filters-block-header">
                <h4 className="crud-filters-label">Estado</h4>
                {estadoFilter !== "all" && (
                  <button
                    type="button"
                    className="filters-limpiar"
                    onClick={() => setEstadoFilter("all")}
                    title="Limpiar estado"
                  >
                    <IconX className="filters-limpiar-icon" />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="crud-filters-chips">
                <button
                  type="button"
                  onClick={() => setEstadoFilter("all")}
                  className={`filter-type-btn ${estadoFilter === "all" ? "filter-type-btn-selected" : "filter-type-btn-unselected"}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoFilter("watched")}
                  className={`filter-type-btn filter-type-btn-with-icon ${estadoFilter === "watched" ? "filter-type-btn-selected" : "filter-type-btn-unselected"}`}
                >
                  <IconEye className="filter-type-icon" />
                  Vistos
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoFilter("unwatched")}
                  className={`filter-type-btn filter-type-btn-with-icon ${estadoFilter === "unwatched" ? "filter-type-btn-selected" : "filter-type-btn-unselected"}`}
                >
                  <IconEyeOff className="filter-type-icon" />
                  No vistos
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Content grid (flex-1 container py-6) */}
      <div className="crud-content">
        {/* Modal Agregar / Editar */}
        {showModal && (
          <div className="add-edit-modal-overlay" onClick={() => { setCreating(false); setEditing(null); }}>
            <motion.div
              className="add-edit-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="add-edit-modal-header">
                <h2 className="add-edit-modal-title">
                  {editing ? "Editar item" : "Agregar nuevo item"}
                </h2>
                <button
                  type="button"
                  className="add-edit-modal-close"
                  onClick={() => { setCreating(false); setEditing(null); }}
                  aria-label="Cerrar"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
              <div className="add-edit-modal-body">
                <ItemForm
                  item={editing ?? undefined}
                  existingTags={existingTags}
                  onSuccess={() => {
                    setCreating(false);
                    setEditing(null);
                    queryClient.invalidateQueries({ queryKey: ["items"] });
                  }}
                  onCancel={() => { setCreating(false); setEditing(null); }}
                />
              </div>
            </motion.div>
          </div>
        )}

        <section className="crud-list">
          {isLoading ? (
            <div className="crud-grid manage-grid crud-skeleton">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="crud-card-skeleton">
                  <div className="crud-card-skeleton-inner">
                    <div className="crud-card-skeleton-image" />
                    <div className="crud-card-skeleton-content">
                      <div className="crud-card-skeleton-line crud-card-skeleton-tipo" />
                      <div className="crud-card-skeleton-line crud-card-skeleton-title" />
                      <div className="crud-card-skeleton-line crud-card-skeleton-meta" />
                      <div className="crud-card-skeleton-actions" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="crud-empty-state">
              <div className="crud-empty-icon-wrap">
                <IconSearch className="crud-empty-icon" />
              </div>
              <h3 className="crud-empty-title">No se encontraron contenidos</h3>
              <p className="crud-empty-text">
                {hasActiveFilters || search.trim()
                  ? "Intenta ajustar los filtros o la búsqueda"
                  : "Agrega tu primer contenido para empezar"}
              </p>
              {!hasActiveFilters && !search.trim() && (
                <button
                  type="button"
                  className="btn-agregar crud-empty-cta"
                  onClick={() => { setCreating(true); setEditing(null); }}
                >
                  <IconPlus className="crud-empty-cta-icon" />
                  Agregar primer contenido
                </button>
              )}
            </div>
          ) : (
            <ul className="crud-grid manage-grid">
              {filteredItems.map((item) => (
                <motion.li key={item.id} layout>
                  <ManageCard
                    item={item}
                    onEdit={setEditing}
                    onDelete={deleteMutation.mutate}
                    onToggleWatched={(id) => { const it = items.find((i) => i.id === id); if (it) toggleVisto(it); }}
                  />
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
