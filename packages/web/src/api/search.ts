/**
 * APIs públicas para autocompletar el formulario de ítems:
 * - TMDB: películas y series (requiere VITE_TMDB_API_KEY en .env)
 * - Jikan: anime (sin API key)
 * - YouTube oEmbed: rellenar desde URL (sin API key)
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const JIKAN_BASE = "https://api.jikan.moe/v4";
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

export type ItemTipo = "movie" | "series" | "anime" | "youtube";

/** Resultado de búsqueda para mostrar en el dropdown */
export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  tipo: ItemTipo;
}

/** Datos para rellenar el formulario */
export interface FormFillData {
  titulo: string;
  descripcion?: string;
  posterUrl?: string;
  url?: string;
  generos?: string[];
  tags?: string[];
}

// --- TMDB (películas y series) ---

interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  homepage?: string;
  genres?: TmdbGenre[];
  vote_average?: number;
}

function tmdbImage(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}${path}`;
}

export async function searchTmdbMovies(query: string): Promise<SearchSuggestion[]> {
  if (!TMDB_KEY?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=es-ES&query=${q}&page=1`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results: TmdbSearchResult[] = data.results ?? [];
  return results.slice(0, 8).map((r) => ({
    id: String(r.id),
    title: r.title ?? "",
    subtitle: r.release_date ? r.release_date.slice(0, 4) : undefined,
    posterUrl: tmdbImage(r.poster_path),
    tipo: "movie" as const,
  }));
}

export async function searchTmdbTv(query: string): Promise<SearchSuggestion[]> {
  if (!TMDB_KEY?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const res = await fetch(
    `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&language=es-ES&query=${q}&page=1`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results: TmdbSearchResult[] = data.results ?? [];
  return results.slice(0, 8).map((r) => ({
    id: String(r.id),
    title: r.name ?? "",
    subtitle: r.first_air_date ? r.first_air_date.slice(0, 4) : undefined,
    posterUrl: tmdbImage(r.poster_path),
    tipo: "series" as const,
  }));
}

export async function getTmdbMovieDetails(id: string): Promise<FormFillData | null> {
  if (!TMDB_KEY?.trim()) return null;
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=es-ES`
  );
  if (!res.ok) return null;
  const r: TmdbDetailsResponse = await res.json();
  const year = r.release_date?.slice(0, 4);
  const tags: string[] = [];
  if (year) tags.push(year);
  if (r.vote_average != null && r.vote_average > 0) tags.push(`⭐ ${r.vote_average.toFixed(1)}`);
  return {
    titulo: r.title ?? "",
    descripcion: r.overview?.trim() || undefined,
    posterUrl: tmdbImage(r.poster_path),
    url: r.homepage?.trim() || undefined,
    generos: r.genres?.map((g) => g.name) ?? [],
    tags: tags.length ? tags : undefined,
  };
}

export async function getTmdbTvDetails(id: string): Promise<FormFillData | null> {
  if (!TMDB_KEY?.trim()) return null;
  const res = await fetch(
    `${TMDB_BASE}/tv/${id}?api_key=${TMDB_KEY}&language=es-ES`
  );
  if (!res.ok) return null;
  const r: TmdbDetailsResponse = await res.json();
  const year = r.first_air_date?.slice(0, 4);
  const tags: string[] = [];
  if (year) tags.push(year);
  if (r.vote_average != null && r.vote_average > 0) tags.push(`⭐ ${r.vote_average.toFixed(1)}`);
  return {
    titulo: r.name ?? "",
    descripcion: r.overview?.trim() || undefined,
    posterUrl: tmdbImage(r.poster_path),
    url: r.homepage?.trim() || undefined,
    generos: r.genres?.map((g) => g.name) ?? [],
    tags: tags.length ? tags : undefined,
  };
}

// --- Jikan (anime) ---

interface JikanAnimeItem {
  mal_id: number;
  title: string;
  title_english?: string;
  images?: { jpg?: { image_url?: string }; webp?: { image_url?: string } };
  year?: number;
  synopsis?: string;
  genres?: { name: string }[];
  score?: number;
  url?: string;
}

interface JikanSearchResponse {
  data?: JikanAnimeItem[];
}

/** Respuesta del endpoint /anime/{id}/full: el anime viene en .data */
interface JikanAnimeDetailsResponse {
  data?: JikanAnimeItem & { synopsis?: string };
}

export async function searchJikanAnime(query: string): Promise<SearchSuggestion[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const res = await fetch(
    `${JIKAN_BASE}/anime?q=${q}&limit=8&order_by=popularity`
  );
  if (!res.ok) return [];
  const data: JikanSearchResponse = await res.json();
  const results = data.data ?? [];
  return results.map((r) => ({
    id: String(r.mal_id),
    title: r.title ?? r.title_english ?? "",
    subtitle: r.year ? String(r.year) : undefined,
    posterUrl: r.images?.jpg?.image_url ?? r.images?.webp?.image_url,
    tipo: "anime" as const,
  }));
}

export async function getJikanAnimeDetails(id: string): Promise<FormFillData | null> {
  const res = await fetch(`${JIKAN_BASE}/anime/${id}/full`);
  if (!res.ok) return null;
  const json: JikanAnimeDetailsResponse = await res.json();
  const r = json.data;
  if (!r) return null;
  const tags: string[] = [];
  if (r.year) tags.push(String(r.year));
  if (r.score != null && r.score > 0) tags.push(`⭐ ${r.score.toFixed(1)}`);
  return {
    titulo: r.title ?? r.title_english ?? "",
    descripcion: r.synopsis?.trim() || undefined,
    posterUrl: r.images?.jpg?.image_url ?? r.images?.webp?.image_url,
    url: r.url?.trim() || undefined,
    generos: r.genres?.map((g) => g.name) ?? [],
    tags: tags.length ? tags : undefined,
  };
}

// --- YouTube oEmbed (rellenar desde URL) ---

const YT_OEMBED = "https://www.youtube.com/oembed";

function extractYoutubeUrl(text: string): string | null {
  const trimmed = text.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/)?youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[0].startsWith("http") ? m[0] : `https://www.youtube.com/watch?v=${m[1]}`;
  }
  return null;
}

interface YoutubeOEmbedResponse {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
}

export async function getYoutubeFromUrl(input: string): Promise<FormFillData | null> {
  const url = extractYoutubeUrl(input);
  if (!url) return null;
  try {
    const res = await fetch(
      `${YT_OEMBED}?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) return null;
    const data: YoutubeOEmbedResponse = await res.json();
    const tags: string[] = [];
    if (data.author_name) tags.push(data.author_name);
    return {
      titulo: data.title ?? "",
      posterUrl: data.thumbnail_url ?? undefined,
      url: url,
      tags: tags.length ? tags : undefined,
    };
  } catch {
    return null;
  }
}

/** Devuelve si TMDB está configurado (para mostrar/ocultar búsqueda de películas y series) */
export function isTmdbConfigured(): boolean {
  return !!TMDB_KEY?.trim();
}
