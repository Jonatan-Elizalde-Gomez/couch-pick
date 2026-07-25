import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  getNextWatchStatus,
  type Item,
  type ItemTipo,
  type WatchStatus,
} from "../api/items";
import ItemForm from "../components/ItemForm";
import ManageCard from "../components/ManageCard";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  IconX,
  IconTrash2,
  IconSearch,
  IconFilter,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconCircleDot,
  IconPlus,
  IconDownload,
  IconUpload,
  IconLogOut,
  IconShuffle,
  IconDotsHorizontal,
} from "../components/icons";
import {
  GENRE_GROUP_LABELS,
  MEDIA_TYPE_COLORS,
  MEDIA_TYPE_LABELS,
  getGenreGroupsForTypes,
  getVisibleGenreOptions,
} from "../lib/constants";
import "./Crud.css";
import "./Main.css";

const TIPOS: ItemTipo[] = ["movie", "series", "anime", "youtube"];
const STATUS_OPTIONS: Array<{
  value: WatchStatus;
  label: string;
  Icon: ({ className }: { className?: string }) => JSX.Element;
}> = [
  { value: "unwatched", label: "No vistos", Icon: IconEyeOff },
  { value: "watching", label: "Viendo", Icon: IconCircleDot },
  { value: "watched", label: "Vistos", Icon: IconEye },
];

export default function Crud() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [tipoFilters, setTipoFilters] = useState<ItemTipo[]>([]);
  const [tipoExcludeFilters, setTipoExcludeFilters] = useState<ItemTipo[]>([]);
  const [generoFilters, setGeneroFilters] = useState<string[]>([]);
  const [generoExcludeFilters, setGeneroExcludeFilters] = useState<string[]>([]);
  const [estadoFilters, setEstadoFilters] = useState<WatchStatus[]>([]);
  const [estadoExcludeFilters, setEstadoExcludeFilters] = useState<WatchStatus[]>([]);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    try {
      const list = await exportBackup();
      const blob = new Blob([JSON.stringify(list, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `couchpick-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error al exportar. Revisa la consola.");
    }
  }, []);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const text = loadEvent.target?.result as string;
          const list = JSON.parse(text) as Item[];
          if (!Array.isArray(list)) {
            throw new Error("El archivo debe ser un array JSON.");
          }
          const { imported } = await importBackup(list);
          queryClient.invalidateQueries({ queryKey: ["items"] });
          alert(`Importados ${imported} ítems. La base anterior fue reemplazada.`);
        } catch (error) {
          console.error(error);
          alert("Error al importar. Revisa que el archivo sea un backup JSON válido.");
        }
        event.target.value = "";
      };

      reader.readAsText(file);
    },
    [queryClient]
  );

  const filters = useMemo(() => {
    const next: {
      tipo?: ItemTipo[];
      tipoExcluir?: ItemTipo[];
      estado?: WatchStatus[];
      estadoExcluir?: WatchStatus[];
      genero?: string[];
      generoExcluir?: string[];
    } = {};

    if (tipoFilters.length > 0) next.tipo = tipoFilters;
    if (tipoExcludeFilters.length > 0) next.tipoExcluir = tipoExcludeFilters;
    if (estadoFilters.length > 0) next.estado = estadoFilters;
    if (estadoExcludeFilters.length > 0) next.estadoExcluir = estadoExcludeFilters;
    if (generoFilters.length > 0) next.genero = generoFilters;
    if (generoExcludeFilters.length > 0) next.generoExcluir = generoExcludeFilters;

    return next;
  }, [tipoFilters, tipoExcludeFilters, estadoFilters, estadoExcludeFilters, generoFilters, generoExcludeFilters]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => getItems(filters),
  });

  const hasActiveFilters =
    tipoFilters.length > 0 ||
    tipoExcludeFilters.length > 0 ||
    generoFilters.length > 0 ||
    generoExcludeFilters.length > 0 ||
    estadoFilters.length > 0 ||
    estadoExcludeFilters.length > 0 ||
    search.trim() !== "";

  const activeFiltersCount =
    (tipoFilters.length + tipoExcludeFilters.length ? 1 : 0) +
    (generoFilters.length + generoExcludeFilters.length ? 1 : 0) +
    (estadoFilters.length + estadoExcludeFilters.length ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const visibleGenreScopes = useMemo(
    () => getGenreGroupsForTypes(tipoFilters),
    [tipoFilters]
  );

  const visibleGenreOptions = useMemo(
    () => getVisibleGenreOptions(tipoFilters),
    [tipoFilters]
  );

  const genreOptionsByScope = useMemo(
    () =>
      visibleGenreScopes
        .map((scope) => ({
          scope,
          title: GENRE_GROUP_LABELS[scope],
          items: visibleGenreOptions.filter((genre) => genre.scope === scope),
        }))
        .filter((group) => group.items.length > 0),
    [visibleGenreOptions, visibleGenreScopes]
  );

  const clearAllFilters = () => {
    setTipoFilters([]);
    setTipoExcludeFilters([]);
    setGeneroFilters([]);
    setGeneroExcludeFilters([]);
    setEstadoFilters([]);
    setEstadoExcludeFilters([]);
    setSearch("");
  };

  const cycleTipoFilter = (tipo: ItemTipo) => {
    const included = tipoFilters.includes(tipo);
    const excluded = tipoExcludeFilters.includes(tipo);

    if (included) {
      setTipoFilters((current) => current.filter((value) => value !== tipo));
      setTipoExcludeFilters((current) => [...current, tipo]);
      return;
    }

    if (excluded) {
      setTipoExcludeFilters((current) => current.filter((value) => value !== tipo));
      return;
    }

    setTipoFilters((current) => [...current, tipo]);
  };

  const cycleGeneroFilter = (genero: string) => {
    const included = generoFilters.includes(genero);
    const excluded = generoExcludeFilters.includes(genero);

    if (included) {
      setGeneroFilters((current) => current.filter((value) => value !== genero));
      setGeneroExcludeFilters((current) => [...current, genero]);
      return;
    }

    if (excluded) {
      setGeneroExcludeFilters((current) => current.filter((value) => value !== genero));
      return;
    }

    setGeneroFilters((current) => [...current, genero]);
  };

  const cycleEstadoFilter = (estado: WatchStatus) => {
    const included = estadoFilters.includes(estado);
    const excluded = estadoExcludeFilters.includes(estado);

    if (included) {
      setEstadoFilters((current) => current.filter((value) => value !== estado));
      setEstadoExcludeFilters((current) => [...current, estado]);
      return;
    }

    if (excluded) {
      setEstadoExcludeFilters((current) => current.filter((value) => value !== estado));
      return;
    }

    setEstadoFilters((current) => [...current, estado]);
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.trim().toLowerCase();

    return items.filter(
      (item) =>
        item.titulo.toLowerCase().includes(query) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
    );
  }, [items, search]);

  const existingTags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags ?? []))],
    [items]
  );

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof updateItem>[1];
    }) => updateItem(id, body),
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

  const cycleItemStatus = (item: Item) => {
    updateMutation.mutate({ id: item.id, body: { estado: getNextWatchStatus(item.estado) } });
  };

  useEffect(() => {
    if (!actionsMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionsMenuOpen]);

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
          <img
            src="/couch-pick-logo-blanco.svg"
            alt="Couch Pick"
            className="crud-logo-image"
          />
          <div className="crud-brand-copy">
            <h1 className="crud-title">Gestionar Contenido</h1>
            <p className="crud-item-count">
              {filteredItems.length} de {items.length}{" "}
              {items.length === 1 ? "contenido" : "contenidos"}
            </p>
          </div>
        </div>

        <div className="crud-header-right">
          <button
            type="button"
            className="nav-btn"
            onClick={() => navigate("/app")}
            title="Volver a Shuffle"
          >
            <IconShuffle className="nav-btn-icon" />
            Shuffle
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
            className="btn-ghost btn-ghost-icon nav-btn-logout"
            onClick={() => setLogoutDialogOpen(true)}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <IconLogOut className="nav-btn-icon" />
          </button>
        </div>
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
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <button
              type="button"
              className={`nav-btn ${filtersOpen ? "nav-btn-active" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <IconFilter className="nav-btn-icon" />
              Filtros
              {hasActiveFilters && (
                <span className="crud-filters-badge">{activeFiltersCount}</span>
              )}
            </button>

            <div className="crud-actions-menu" ref={actionsMenuRef}>
              <button
                type="button"
                className={`nav-btn crud-actions-trigger ${
                  actionsMenuOpen ? "nav-btn-active" : ""
                }`}
                onClick={() => setActionsMenuOpen((open) => !open)}
                aria-expanded={actionsMenuOpen}
                aria-label="Más acciones"
                title="Más acciones"
              >
                <IconDotsHorizontal className="nav-btn-icon" />
              </button>

              {actionsMenuOpen && (
                <div
                  className="crud-actions-dropdown"
                  role="menu"
                  aria-label="Acciones de contenido"
                >
                  <button
                    type="button"
                    className="crud-actions-dropdown-item"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      importInputRef.current?.click();
                    }}
                  >
                    <IconUpload className="nav-btn-icon" />
                    Importar
                  </button>

                  <button
                    type="button"
                    className="crud-actions-dropdown-item"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      void handleExport();
                    }}
                  >
                    <IconDownload className="nav-btn-icon" />
                    Exportar
                  </button>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="nav-btn crud-clear-all-btn"
                onClick={clearAllFilters}
                title="Limpiar todos los filtros"
              >
                <IconTrash2 className="filters-limpiar-icon" />
                Limpiar todo
              </button>
            )}
          </div>

          <div className={`crud-filters-collapse ${filtersOpen ? "crud-filters-collapse-open" : ""}`}>
            <div className="crud-filters-collapse-inner">
              <div className="crud-filters-panel">
                <div className="crud-filters-block">
                  <div className="crud-filters-block-header">
                    <div className="crud-filters-heading">
                      <h4 className="crud-filters-label">Tipo</h4>
                      <p className="crud-filters-hint">
                        Define qué formatos quieres incluir o dejar fuera del listado.
                      </p>
                    </div>
                    {(tipoFilters.length > 0 || tipoExcludeFilters.length > 0) && (
                      <button
                        type="button"
                        className="filters-inline-clear"
                        onClick={() => {
                          setTipoFilters([]);
                          setTipoExcludeFilters([]);
                        }}
                        title="Limpiar tipo"
                      >
                        <IconTrash2 className="filters-limpiar-icon" />
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="crud-filters-chips">
                    {TIPOS.map((tipo) => {
                      const mode = tipoFilters.includes(tipo)
                        ? "incluir"
                        : tipoExcludeFilters.includes(tipo)
                          ? "excluir"
                          : "off";

                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => cycleTipoFilter(tipo)}
                          className={`filter-type-btn filter-chip filter-chip-${mode} ${
                            mode === "off" ? "filter-type-btn-unselected" : MEDIA_TYPE_COLORS[tipo]
                          }`}
                        >
                          {MEDIA_TYPE_LABELS[tipo]}
                          {mode === "incluir" && (
                            <span className="filter-chip-badge filter-chip-badge-incluir">
                              Incluir
                            </span>
                          )}
                          {mode === "excluir" && (
                            <span className="filter-chip-badge filter-chip-badge-excluir">
                              Excluir
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="crud-filters-block">
                  <div className="crud-filters-block-header">
                    <div className="crud-filters-heading">
                      <h4 className="crud-filters-label">Géneros</h4>
                      <p className="crud-filters-hint">
                        Se agrupan por comunes, anime y película/serie según el tipo activo.
                      </p>
                    </div>
                    {(generoFilters.length > 0 || generoExcludeFilters.length > 0) && (
                      <button
                        type="button"
                        className="filters-inline-clear"
                        onClick={() => {
                          setGeneroFilters([]);
                          setGeneroExcludeFilters([]);
                        }}
                        title="Limpiar géneros"
                      >
                        <IconTrash2 className="filters-limpiar-icon" />
                        Limpiar
                      </button>
                    )}
                  </div>

                  {genreOptionsByScope.length > 0 ? (
                    <div className="crud-genre-groups">
                      {genreOptionsByScope.map((group) => (
                        <div key={group.scope} className="crud-genre-group">
                          <div className="crud-genre-group-title">{group.title}</div>
                          <div className="crud-filters-chips">
                            {group.items.map((genre) => {
                              const mode = generoFilters.includes(genre.label)
                                ? "incluir"
                                : generoExcludeFilters.includes(genre.label)
                                  ? "excluir"
                                  : "off";

                              return (
                                <button
                                  key={genre.label}
                                  type="button"
                                  onClick={() => cycleGeneroFilter(genre.label)}
                                  className={`filter-type-btn filter-chip filter-chip-${mode} ${
                                    mode === "off" ? "filter-type-btn-unselected" : ""
                                  }`}
                                >
                                  {genre.label}
                                  {mode === "incluir" && (
                                    <span className="filter-chip-badge filter-chip-badge-incluir">
                                      Incluir
                                    </span>
                                  )}
                                  {mode === "excluir" && (
                                    <span className="filter-chip-badge filter-chip-badge-excluir">
                                      Excluir
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="crud-filters-empty">
                      Con el tipo activo actual no hay géneros aplicables para filtrar.
                    </p>
                  )}
                </div>

                <div className="crud-filters-block">
                  <div className="crud-filters-block-header">
                    <div className="crud-filters-heading">
                      <h4 className="crud-filters-label">Estado</h4>
                      <p className="crud-filters-hint">
                        Toca un estado para incluirlo, vuelve a tocar para excluirlo y una vez más para quitarlo.
                      </p>
                    </div>
                    {(estadoFilters.length > 0 || estadoExcludeFilters.length > 0) && (
                      <button
                        type="button"
                        className="filters-inline-clear"
                        onClick={() => {
                          setEstadoFilters([]);
                          setEstadoExcludeFilters([]);
                        }}
                        title="Limpiar estado"
                      >
                        <IconTrash2 className="filters-limpiar-icon" />
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="crud-filters-chips">
                    <button
                      type="button"
                      onClick={() => {
                        setEstadoFilters([]);
                        setEstadoExcludeFilters([]);
                      }}
                      className={`filter-type-btn ${
                        estadoFilters.length === 0 && estadoExcludeFilters.length === 0
                          ? "filter-type-btn-selected"
                          : "filter-type-btn-unselected"
                      }`}
                    >
                      Todos
                    </button>

                    {STATUS_OPTIONS.map(({ value, label, Icon }) => {
                      const mode = estadoFilters.includes(value)
                        ? "incluir"
                        : estadoExcludeFilters.includes(value)
                          ? "excluir"
                          : "off";

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => cycleEstadoFilter(value)}
                          className={`filter-type-btn filter-chip filter-chip-${mode} ${
                            mode === "off" ? "filter-type-btn-unselected" : ""
                          }`}
                        >
                          <Icon className="filter-type-icon" />
                          {label}
                          {mode === "incluir" && (
                            <span className="filter-chip-badge filter-chip-badge-incluir">
                              Incluir
                            </span>
                          )}
                          {mode === "excluir" && (
                            <span className="filter-chip-badge filter-chip-badge-excluir">
                              Excluir
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="crud-content">
        <button
          type="button"
          className="crud-fab-add"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
        >
          <IconPlus className="crud-fab-icon" />
          Agregar
        </button>

        {showModal && (
          <div
            className="add-edit-modal-overlay"
            onClick={() => {
              setCreating(false);
              setEditing(null);
            }}
          >
            <motion.div
              className="add-edit-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="add-edit-modal-header">
                <h2 className="add-edit-modal-title">
                  {editing ? "Editar item" : "Agregar nuevo item"}
                </h2>
                <button
                  type="button"
                  className="add-edit-modal-close"
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
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
                  onCancel={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}

        <section className="crud-list">
          {isLoading ? (
            <div className="crud-grid manage-grid crud-skeleton">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="crud-card-skeleton">
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
                  onClick={() => {
                    setCreating(true);
                    setEditing(null);
                  }}
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
                    onCycleStatus={(id) => {
                      const currentItem = items.find((entry) => entry.id === id);
                      if (currentItem) cycleItemStatus(currentItem);
                    }}
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
