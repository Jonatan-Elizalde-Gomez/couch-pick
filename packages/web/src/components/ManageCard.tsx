import { useState } from "react";
import type { Item } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import { IconEye, IconEyeOff, IconPencil, IconTrash2 } from "./icons";
import "./ManageCard.css";

interface ManageCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onToggleWatched: (id: string) => void;
}

export default function ManageCard({
  item,
  onEdit,
  onDelete,
  onToggleWatched,
}: ManageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const img = item.posterUrl ?? item.thumbnailUrl ?? null;
  const tipoClass = MEDIA_TYPE_COLORS[item.tipo] ?? "";

  return (
    <div className={`manage-card ${item.visto ? "manage-card-watched" : ""}`}>
      <div className="manage-card-inner">
        <div className="manage-card-image">
          {img ? (
            <img src={img} alt={item.titulo} />
          ) : (
            <div className="manage-card-image-placeholder" />
          )}
          {item.visto && (
            <div className="manage-card-watched-overlay">
              <IconEye className="manage-card-eye-icon" />
            </div>
          )}
        </div>

        <div className="manage-card-content">
          <div className="manage-card-header">
            <div className="manage-card-meta">
              <span className={`manage-card-tipo ${tipoClass}`}>
                {MEDIA_TYPE_LABELS[item.tipo]}
              </span>
              <h3 className="manage-card-title">{item.titulo}</h3>
            </div>
            <div className="manage-card-menu-wrap">
              <button
                type="button"
                className="manage-card-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label="Más opciones"
              >
                ⋮
              </button>
              {menuOpen && (
                <>
                  <div className="manage-card-menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="manage-card-menu">
                    <button type="button" onClick={() => { onEdit(item); setMenuOpen(false); }}>
                      <IconPencil className="menu-icon" />
                      Editar
                    </button>
                    <button type="button" onClick={() => { onToggleWatched(item.id); setMenuOpen(false); }}>
                      {item.visto ? (
                        <>
                          <IconEyeOff className="menu-icon" />
                          Marcar no visto
                        </>
                      ) : (
                        <>
                          <IconEye className="menu-icon" />
                          Marcar visto
                        </>
                      )}
                    </button>
                    <hr className="menu-sep" />
                    <button
                      type="button"
                      className="menu-danger"
                      onClick={() => { if (window.confirm("¿Eliminar?")) onDelete(item.id); setMenuOpen(false); }}
                    >
                      <IconTrash2 className="menu-icon" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {item.generos && item.generos.length > 0 && (
            <div className="manage-card-genres">
              {item.generos.slice(0, 3).map((g) => (
                <span key={g} className="manage-card-genre">{g}</span>
              ))}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="manage-card-tags">
              {item.tags.slice(0, 3).map((t) => (
                <span key={t} className="manage-card-tag" title={t}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="manage-card-actions">
        <button
          type="button"
          className={`manage-card-action ${item.visto ? "action-watched" : "action-unwatched"}`}
          onClick={() => onToggleWatched(item.id)}
        >
          {item.visto ? (
            <>
              <IconEye className="action-icon" />
              Visto
            </>
          ) : (
            <>
              <IconEyeOff className="action-icon" />
              No visto
            </>
          )}
        </button>
        <div className="manage-card-action-sep" />
        <button
          type="button"
          className="manage-card-action manage-card-action-edit"
          onClick={() => onEdit(item)}
        >
          <IconPencil className="action-icon" />
          Editar
        </button>
      </div>
    </div>
  );
}
