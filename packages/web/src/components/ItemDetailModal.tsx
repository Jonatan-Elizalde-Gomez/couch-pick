import { motion } from "framer-motion";
import type { Item } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import { IconX, IconEye, IconExternalLink } from "./icons";
import "./ItemDetailModal.css";

export default function ItemDetailModal({
  item,
  onClose,
  onMarkWatched,
}: {
  item: Item;
  onClose: () => void;
  onMarkWatched?: () => void;
}) {
  const img = item.posterUrl ?? item.thumbnailUrl ?? null;
  const hasUrl = !!item.url?.trim();
  const verEnlaceLabel = item.tipo === "youtube" ? "Ver en YouTube" : "Ver enlace";
  const tipoClass = MEDIA_TYPE_COLORS[item.tipo] ?? "";

  return (
    <motion.div
      className="item-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="item-detail-modal"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="item-detail-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <IconX className="item-detail-close-icon" />
        </button>

        <div className="item-detail-body">
          <div className="item-detail-flex">
            <div className="item-detail-thumb">
              {img ? (
                <img src={img} alt="" />
              ) : (
                <div className="item-detail-thumb-placeholder" />
              )}
              <div className="item-detail-thumb-ring" />
            </div>
            <div className="item-detail-info">
              <span className={`item-detail-tipo ${tipoClass}`}>
                {MEDIA_TYPE_LABELS[item.tipo] ?? item.tipo}
              </span>
              <h2 className="item-detail-title">{item.titulo}</h2>
              {item.descripcion && (
                <p className="item-detail-desc">{item.descripcion}</p>
              )}
            </div>
          </div>

          {item.generos && item.generos.length > 0 && (
            <div className="item-detail-generos">
              {item.generos.map((g) => (
                <span key={g} className="item-detail-genre">{g}</span>
              ))}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="item-detail-tags">
              {item.tags.map((t) => (
                <span key={t} className="item-detail-tag">#{t}</span>
              ))}
            </div>
          )}
        </div>

        <footer className="item-detail-footer">
          {!item.visto && onMarkWatched && (
            <button type="button" className="item-detail-btn item-detail-btn-primary" onClick={onMarkWatched}>
              <IconEye className="item-detail-btn-icon" />
              Vista
            </button>
          )}
          {hasUrl && (
            <a
              href={item.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="item-detail-btn item-detail-btn-outline"
            >
              <IconExternalLink className="item-detail-btn-icon" />
              {verEnlaceLabel}
            </a>
          )}
          <button type="button" className="item-detail-btn item-detail-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
