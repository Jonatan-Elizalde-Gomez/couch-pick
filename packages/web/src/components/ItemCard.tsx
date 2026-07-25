import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import { IconEye, IconEyeOff } from "./icons";
import "./ItemCard.css";

export default function ItemCard({ item, showEye, onClick, onToggleVisto }: { item: Item; showEye?: boolean; onClick?: () => void; onToggleVisto?: () => void }) {
  const img = item.posterUrl ?? item.thumbnailUrl ?? null;
  const tipoClass = MEDIA_TYPE_COLORS[item.tipo] ?? "";
  const genres = useMemo(() => item.generos?.filter(Boolean) ?? [], [item.generos]);
  const metaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleGenres, setVisibleGenres] = useState<string[]>([]);

  useEffect(() => {
    function updateVisibleGenres() {
      const container = metaRef.current;
      const measure = measureRef.current;
      if (!container || !measure || genres.length === 0) {
        setVisibleGenres((current) => (current.length === 0 ? current : []));
        return;
      }

      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) {
        setVisibleGenres((current) => (current.length === 0 ? current : []));
        return;
      }

      const chips = Array.from(measure.querySelectorAll<HTMLElement>("[data-genre-chip]"));
      const nextVisible: string[] = [];
      let usedWidth = 0;
      const gap = 6;

      for (let index = 0; index < genres.length; index += 1) {
        const chip = chips[index];
        if (!chip) continue;

        const chipWidth = Math.ceil(chip.getBoundingClientRect().width);
        if (chipWidth > availableWidth) continue;

        const projectedWidth = nextVisible.length === 0 ? chipWidth : usedWidth + gap + chipWidth;
        if (projectedWidth > availableWidth) continue;

        nextVisible.push(genres[index]);
        usedWidth = projectedWidth;
      }

      setVisibleGenres((current) => (
        current.length === nextVisible.length && current.every((value, index) => value === nextVisible[index])
          ? current
          : nextVisible
      ));
    }

    updateVisibleGenres();

    const container = metaRef.current;
    if (!container) return;

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateVisibleGenres());
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateVisibleGenres);
    return () => window.removeEventListener("resize", updateVisibleGenres);
  }, [genres]);

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
        <h3 className={`item-card-title ${visibleGenres.length > 0 ? "item-card-title-single-line" : ""}`}>{item.titulo}</h3>
        {genres.length > 0 && (
          <>
            <div ref={metaRef} className="item-card-meta">
              {visibleGenres.map((value) => (
                <span key={value} className="item-card-genre" title={value}>
                  {value}
                </span>
              ))}
            </div>
            <div ref={measureRef} className="item-card-meta-measure" aria-hidden>
              {genres.map((value) => (
                <span key={value} data-genre-chip className="item-card-genre">
                  {value}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.article>
  );
}
