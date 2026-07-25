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

export type GenreScope = "common" | "screen" | "anime";

export interface GenreOption {
  label: string;
  scope: GenreScope;
}

export const GENRE_OPTIONS_WITH_SCOPE: GenreOption[] = [
  { label: "Acción", scope: "common" },
  { label: "Aventura", scope: "common" },
  { label: "Animación", scope: "common" },
  { label: "Comedia", scope: "common" },
  { label: "Crimen", scope: "common" },
  { label: "Documental", scope: "common" },
  { label: "Drama", scope: "common" },
  { label: "Familiar", scope: "common" },
  { label: "Fantasía", scope: "common" },
  { label: "Historia", scope: "common" },
  { label: "Terror", scope: "common" },
  { label: "Música", scope: "common" },
  { label: "Misterio", scope: "common" },
  { label: "Romance", scope: "common" },
  { label: "Ciencia ficción", scope: "common" },
  { label: "Thriller", scope: "common" },
  { label: "Bélico", scope: "common" },
  { label: "Western", scope: "common" },
  { label: "Infantil", scope: "common" },
  { label: "Política", scope: "common" },
  { label: "Deportes", scope: "common" },
  { label: "Magia", scope: "common" },
  { label: "Sobrenatural", scope: "common" },
  { label: "Psicológico", scope: "common" },
  { label: "Artes marciales", scope: "common" },
  { label: "Militar", scope: "common" },
  { label: "Parodia", scope: "common" },
  { label: "Cocina", scope: "common" },
  { label: "Superpoderes", scope: "common" },
  { label: "Tragedia", scope: "common" },
  { label: "Amistad", scope: "common" },
  { label: "Telefilme", scope: "screen" },
  { label: "Noticias", scope: "screen" },
  { label: "Reality", scope: "screen" },
  { label: "Telenovela", scope: "screen" },
  { label: "Talk show", scope: "screen" },
  { label: "Policía", scope: "anime" },
  { label: "Espacial", scope: "anime" },
  { label: "Vida cotidiana", scope: "anime" },
  { label: "Carreras", scope: "anime" },
  { label: "Escolar", scope: "anime" },
  { label: "Ecchi", scope: "anime" },
  { label: "Vampiros", scope: "anime" },
  { label: "Demencia", scope: "anime" },
  { label: "Mecha", scope: "anime" },
  { label: "Demonios", scope: "anime" },
  { label: "Samurái", scope: "anime" },
  { label: "Harem", scope: "anime" },
  { label: "Shoujo ai", scope: "anime" },
  { label: "Juego", scope: "anime" },
  { label: "Shounen ai", scope: "anime" },
  { label: "Yuri", scope: "anime" },
  { label: "Yaoi", scope: "anime" },
  { label: "Anime influenciado", scope: "anime" },
  { label: "Género bender", scope: "anime" },
  { label: "Doujinshi", scope: "anime" },
  { label: "Mahou shojo", scope: "anime" },
  { label: "Mahou shounen", scope: "anime" },
  { label: "Gore", scope: "anime" },
  { label: "Legal", scope: "anime" },
  { label: "Maduro", scope: "anime" },
  { label: "Médico", scope: "anime" },
  { label: "Tokusatsu", scope: "anime" },
  { label: "Juventud", scope: "anime" },
  { label: "Trabajo", scope: "anime" },
  { label: "Zombies", scope: "anime" },
  { label: "Isekai", scope: "anime" },
];

export const GENRE_OPTIONS = GENRE_OPTIONS_WITH_SCOPE.map((genre) => genre.label);

export const GENRE_GROUP_LABELS: Record<GenreScope, string> = {
  common: "Comunes",
  screen: "Películas y series",
  anime: "Anime",
};

export function getGenreGroupsForTypes(selectedTypes: ItemTipo[] | undefined): GenreScope[] {
  const included = new Set(selectedTypes ?? []);
  const hasRelevantSelection = [...included].some(
    (type) => type === "movie" || type === "series" || type === "anime"
  );
  const hasMovieOrSeries = included.has("movie") || included.has("series");
  const hasAnime = included.has("anime");

  if (!included.size) return ["common", "screen", "anime"];
  if (!hasRelevantSelection) return [];
  if (hasMovieOrSeries && hasAnime) return ["common", "screen", "anime"];
  if (hasMovieOrSeries) return ["common", "screen"];
  if (hasAnime) return ["common", "anime"];
  return ["common", "screen", "anime"];
}

export function getVisibleGenreOptions(selectedTypes: ItemTipo[] | undefined): GenreOption[] {
  const visibleScopes = new Set(getGenreGroupsForTypes(selectedTypes));
  return GENRE_OPTIONS_WITH_SCOPE.filter((genre) => visibleScopes.has(genre.scope));
}
