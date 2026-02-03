import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Item } from "../api/items";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_COLORS } from "../lib/constants";
import { IconX, IconSparkles, IconEye, IconExternalLink } from "./icons";
import "./ShuffleAnimation.css";

const CONFETTI_COLORS = [
  "rgb(34, 197, 94)",
  "rgb(59, 130, 246)",
  "rgb(236, 72, 153)",
  "rgb(234, 179, 8)",
  "rgb(168, 85, 247)",
];

const CENTER_X = 0;
const CENTER_Y = 0;
const BASE_RADIUS = 120;

export interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

type ShufflePhase = "stack" | "explode" | "circle" | "spinning" | "collapse" | "reveal" | "done";

export default function ShuffleAnimation({
  item,
  items,
  onClose,
  onMarkWatched,
}: {
  item: Item;
  items: Item[];
  onClose: () => void;
  onMarkWatched?: () => void;
}) {
  const winnerId = item.id;
  const orbitItems = (items && items.length > 0 ? items : [item]).slice(0, 12);
  const n = orbitItems.length;

  const [phase, setPhase] = useState<ShufflePhase>("stack");
  const [showContent, setShowContent] = useState(false);
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>(() => {
    const list = (items && items.length > 0 ? items : [item]).slice(0, 12);
    const positions: Record<string, CardPosition> = {};
    list.forEach((card, index) => {
      positions[card.id] = {
        x: CENTER_X,
        y: CENTER_Y - index * 2,
        rotation: (Math.random() - 0.5) * 15,
        scale: 0.55,
        opacity: 1,
        zIndex: list.length - index,
      };
    });
    return positions;
  });
  const baseAnglesRef = useRef<number[]>([]);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fase 2: Explode (después de ~300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("explode");
      const positions: Record<string, CardPosition> = {};
      orbitItems.forEach((card) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 120;
        positions[card.id] = {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rotation: Math.random() * 540 - 270,
          scale: 0.45,
          opacity: 1,
          zIndex: Math.floor(Math.random() * n),
        };
      });
      setCardPositions(positions);
    }, 320);
    return () => clearTimeout(t);
  }, []);

  // Fase 3: Circle (después de ~350ms más)
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("circle");
      baseAnglesRef.current = orbitItems.map((_, i) => (i / n) * Math.PI * 2 - Math.PI / 2);
      const positions: Record<string, CardPosition> = {};
      orbitItems.forEach((card, index) => {
        const angle = baseAnglesRef.current[index];
        positions[card.id] = {
          x: Math.cos(angle) * BASE_RADIUS,
          y: Math.sin(angle) * BASE_RADIUS,
          rotation: (angle * 180) / Math.PI + 90,
          scale: 0.5,
          opacity: 1,
          zIndex: index,
        };
      });
      setCardPositions(positions);
    }, 320 + 380);
    return () => clearTimeout(t);
  }, []);

  // Fase 4: Spinning (empezar después de circle, ~700ms más)
  useEffect(() => {
    const startSpinning = 320 + 380 + 400;
    const t = setTimeout(() => {
      setPhase("spinning");
      const spinIterations = Math.min(18, 10 + Math.floor(n / 2));
      let spinCount = 0;

      spinIntervalRef.current = setInterval(() => {
        spinCount++;
        const progress = spinCount / spinIterations;
        const currentRadius = BASE_RADIUS * Math.max(0, 1 - progress * 0.9);
        const speedMultiplier = 0.3 + progress * 0.4;

        setCardPositions((prev) => {
          const next: Record<string, CardPosition> = {};
          orbitItems.forEach((card, index) => {
            const baseAngle = baseAnglesRef.current[index] ?? 0;
            const angle = baseAngle + spinCount * speedMultiplier;
            const rot = (prev[card.id]?.rotation ?? 0) + 30;
            next[card.id] = {
              x: Math.cos(angle) * currentRadius,
              y: Math.sin(angle) * currentRadius,
              rotation: rot,
              scale: 0.5 + progress * 0.15,
              opacity: 1,
              zIndex: index,
            };
          });
          return next;
        });

        if (spinCount >= spinIterations) {
          if (spinIntervalRef.current) {
            clearInterval(spinIntervalRef.current);
            spinIntervalRef.current = null;
          }
          setPhase("collapse");
          const collapsePositions: Record<string, CardPosition> = {};
          orbitItems.forEach((card) => {
            collapsePositions[card.id] = {
              x: CENTER_X,
              y: CENTER_Y,
              rotation: 0,
              scale: card.id === winnerId ? 0.7 : 0.45,
              opacity: card.id === winnerId ? 1 : 0.2,
              zIndex: card.id === winnerId ? 100 : 1,
            };
          });
          setCardPositions(collapsePositions);

          setTimeout(() => {
            setPhase("reveal");
            const revealPositions: Record<string, CardPosition> = {};
            orbitItems.forEach((card) => {
              revealPositions[card.id] = {
                x: CENTER_X,
                y: card.id === winnerId ? CENTER_Y : CENTER_Y,
                rotation: 0,
                scale: card.id === winnerId ? 1.2 : 0.3,
                opacity: card.id === winnerId ? 1 : 0,
                zIndex: card.id === winnerId ? 100 : 1,
              };
            });
            setCardPositions(revealPositions);

            setTimeout(() => {
              setPhase("done");
              setShowContent(true);
            }, 450);
          }, 450);
        }
      }, 70);
    }, startSpinning);

    return () => {
      clearTimeout(t);
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, [winnerId, n]);

  const img = item.posterUrl ?? item.thumbnailUrl ?? null;
  const hasUrl = !!item.url?.trim();
  const verEnlaceLabel = item.tipo === "youtube" ? "Ver en YouTube" : "Ver enlace";
  const tipoClass = MEDIA_TYPE_COLORS[item.tipo] ?? "";

  const isAnimating = phase !== "done";
  const showWinnerModal = phase === "done" && showContent;

  return (
    <motion.div
      className="shuffle-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {phase === "done" && showContent && (
        <div className="shuffle-confetti" aria-hidden>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="shuffle-confetti-dot"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className={`shuffle-modal shuffle-modal-winner ${showContent ? "shuffle-modal-visible" : ""}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {isAnimating && (
            <motion.div
              key="shuffle-cards"
              className="shuffle-spin"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="shuffle-orbit-wrapper">
                {orbitItems.map((card) => {
                  const pos = cardPositions[card.id];
                  if (!pos) return null;
                  const showWinnerGlow = (phase === "collapse" || phase === "reveal") && card.id === winnerId;
                  const hasImage = !!(card.posterUrl ?? card.thumbnailUrl);
                  return (
                    <motion.div
                      key={card.id}
                      className={`shuffle-orbit-card ${showWinnerGlow ? "shuffle-orbit-card-active" : ""}`}
                      initial={false}
                      animate={{
                        x: pos.x,
                        y: pos.y,
                        rotate: pos.rotation,
                        scale: pos.scale,
                        opacity: pos.opacity,
                      }}
                      transition={{
                        type: "tween",
                        duration: phase === "spinning" ? 0.07 : 0.35,
                        ease: "easeOut",
                      }}
                      style={{ zIndex: pos.zIndex }}
                    >
                      <div className={`shuffle-orbit-card-inner ${!hasImage ? "shuffle-orbit-card-inner-no-img" : ""}`}>
                        {hasImage ? (
                          <img src={card.posterUrl ?? card.thumbnailUrl ?? ""} alt="" />
                        ) : (
                          <div className="shuffle-orbit-card-placeholder" aria-hidden />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="shuffle-text">
                {phase === "stack" || phase === "explode" || phase === "circle"
                  ? "Barajeando…"
                  : phase === "spinning"
                    ? "Eligiendo…"
                    : phase === "collapse" || phase === "reveal"
                      ? "¡Tu elección!"
                      : "Barajeando…"}
              </p>
            </motion.div>
          )}
          {showWinnerModal && showContent && (
            <motion.div
              key="reveal"
              className="shuffle-reveal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <button
                type="button"
                className="shuffle-close-btn"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>

              <header className="shuffle-winner-header">
                <div className="shuffle-winner-icon-wrap">
                  <IconSparkles className="shuffle-winner-icon" />
                </div>
                <h2 className="shuffle-winner-title">Tu elección es...</h2>
              </header>

              <div className="shuffle-winner-body">
                <div className="shuffle-winner-flex">
                  <div className="shuffle-winner-thumb">
                    {img ? (
                      <img src={img} alt="" />
                    ) : (
                      <div className="shuffle-winner-thumb-placeholder" />
                    )}
                    <div className="shuffle-winner-thumb-ring" />
                  </div>
                  <div className="shuffle-winner-info">
                    <span className={`shuffle-winner-tipo ${tipoClass}`}>
                      {MEDIA_TYPE_LABELS[item.tipo] ?? item.tipo}
                    </span>
                    <h3 className="shuffle-winner-item-title">{item.titulo}</h3>
                    {item.descripcion && (
                      <p className="shuffle-winner-desc">{item.descripcion}</p>
                    )}
                  </div>
                </div>

                {item.generos && item.generos.length > 0 && (
                  <div className="shuffle-winner-generos">
                    {item.generos.map((g) => (
                      <span key={g} className="shuffle-winner-genre">{g}</span>
                    ))}
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="shuffle-winner-tags">
                    {item.tags.map((t) => (
                      <span key={t} className="shuffle-winner-tag">#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <footer className="shuffle-winner-footer">
                {!item.visto && onMarkWatched && (
                  <button type="button" className="btn-marcar-vista" onClick={onMarkWatched}>
                    <IconEye className="btn-icon" />
                    Vista
                  </button>
                )}
                {hasUrl && (
                  <a
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ver-externo"
                  >
                    <IconExternalLink className="btn-icon" />
                    {verEnlaceLabel}
                  </a>
                )}
                <button type="button" className="btn-cerrar" onClick={onClose}>
                  Cerrar
                </button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
