import { motion } from "framer-motion";
import type { Item } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import { IconEye, IconEyeOff } from "./icons";
import "./ItemCard.css";

export default function ItemCard({ item, showEye, onClick, onToggleVisto }: { item: Item; showEye?: boolean; onClick?: () => void; onToggleVisto?: () => void }) {
  const img = item.posterUrl ?? item.thumbnailUrl ?? null;
  const tipoClass = MEDIA_TYPE_COLORS[item.tipo] ?? "";

  return (
    <motion.article
      className="item-card media-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="item-card-poster">
        <div className="item-card-poster-inner">
          {img ? (
            <img src={img} alt="" loading="lazy" className="item-card-img" />
          ) : (
            <div className="item-card-placeholder" />
          )}
          {/* Overlay gradient: mismo contenedor que la imagen para que escale junto en hover */}
          <div className="item-card-overlay" />
        </div>
        <span className={`item-card-tipo pill rounded-full ${tipoClass}`}>
          {MEDIA_TYPE_LABELS[item.tipo] ?? item.tipo}
        </span>
        {showEye && (
          <div
            className={`item-card-eye-wrap ${item.visto ? "visto" : "no-visto"}`}
            title={item.visto ? "Visto" : "No visto"}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisto?.();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" || e.key === " ") onToggleVisto?.();
            }}
          >
            {item.visto ? (
              <IconEye className="item-card-eye-icon" />
            ) : (
              <IconEyeOff className="item-card-eye-icon" />
            )}
          </div>
        )}
        {!showEye && item.visto && <span className="item-card-badge visto">Visto</span>}
      </div>
      <div className="item-card-body">
        <h3 className="item-card-title">{item.titulo}</h3>
        {item.tags && item.tags.length > 0 && (
          <div className="item-card-tags">
            {item.tags.slice(0, 2).map((t) => (
              <span key={t} className="tag" title={t}>#{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
