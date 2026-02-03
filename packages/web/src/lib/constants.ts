import type { ItemTipo } from "../api/items";

export const MEDIA_TYPE_LABELS: Record<ItemTipo, string> = {
  movie: "Película",
  series: "Serie",
  anime: "Anime",
  youtube: "YouTube",
};

export const MEDIA_TYPE_COLORS: Record<ItemTipo, string> = {
  movie: "tipo-pelicula",
  series: "tipo-serie",
  anime: "tipo-anime",
  youtube: "tipo-youtube",
};

/** Géneros para selector en formulario y filtros */
export const GENRE_OPTIONS = [
  "Acción",
  "Comedia",
  "Drama",
  "Terror",
  "Romance",
  "Ciencia Ficción",
  "Fantasia",
  "Suspenso",
  "Documental",
  "Animación",
] as const;
