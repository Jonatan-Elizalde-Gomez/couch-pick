import { GENRE_OPTIONS } from "../lib/constants";

/**
 * Public APIs used to autocomplete item forms:
 * - TMDB: movies and series (requires VITE_TMDB_API_KEY)
 * - Kitsu: anime (no API key)
 * - YouTube oEmbed: fill from URL (no API key)
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const KITSU_BASE = "https://kitsu.io/api/edge";
const YT_OEMBED = "https://www.youtube.com/oembed";
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

const PRIORITY_STREAMERS = [
  "netflix",
  "disney plus",
  "disney+",
  "max",
  "hbo max",
  "paramount plus",
  "paramount+",
  "crunchyroll",
];

const ANIME_GENRE_LABELS = {
  action: ["Acción"],
  adventure: ["Aventura"],
  animation: ["Animación"],
  comedy: ["Comedia"],
  crime: ["Crimen"],
  documentary: ["Documental"],
  drama: ["Drama"],
  family: ["Familiar"],
  fantasy: ["Fantasía"],
  "fantasy world": ["Fantasía"],
  history: ["Historia"],
  historical: ["Historia"],
  horror: ["Terror"],
  music: ["Música"],
  mystery: ["Misterio"],
  romance: ["Romance"],
  "science fiction": ["Ciencia ficción"],
  "sci-fi": ["Ciencia ficción"],
  thriller: ["Thriller"],
  suspense: ["Thriller"],
  war: ["Bélico"],
  western: ["Western"],
  kids: ["Infantil"],
  news: ["Noticias"],
  reality: ["Reality"],
  soap: ["Telenovela"],
  talk: ["Talk show"],
  political: ["Política"],
  space: ["Espacial"],
  magic: ["Magia"],
  supernatural: ["Sobrenatural"],
  police: ["Policía"],
  sports: ["Deportes"],
  "slice of life": ["Vida cotidiana"],
  cars: ["Carreras"],
  racing: ["Carreras"],
  psychological: ["Psicológico"],
  "martial arts": ["Artes marciales"],
  school: ["Escolar"],
  ecchi: ["Ecchi"],
  vampire: ["Vampiros"],
  military: ["Militar"],
  dementia: ["Demencia"],
  mecha: ["Mecha"],
  demons: ["Demonios"],
  samurai: ["Samurái"],
  harem: ["Harem"],
  parody: ["Parodia"],
  "shoujo ai": ["Shoujo ai"],
  game: ["Juego"],
  "shounen ai": ["Shounen ai"],
  yuri: ["Yuri"],
  yaoi: ["Yaoi"],
  "anime influenced": ["Anime influenciado"],
  "gender bender": ["Género bender"],
  doujinshi: ["Doujinshi"],
  "mahou shoujo": ["Mahou shojo"],
  "mahou shounen": ["Mahou shounen"],
  gore: ["Gore"],
  law: ["Legal"],
  cooking: ["Cocina"],
  food: ["Cocina"],
  mature: ["Maduro"],
  medical: ["Médico"],
  tokusatsu: ["Tokusatsu"],
  youth: ["Juventud"],
  workplace: ["Trabajo"],
  "super power": ["Superpoderes"],
  zombies: ["Zombies"],
  tragedy: ["Tragedia"],
  isekai: ["Isekai"],
  friendship: ["Amistad"],
} satisfies Record<string, readonly (typeof GENRE_OPTIONS)[number][]>;

const TMDB_GENRE_ID_LABELS: Record<number, readonly (typeof GENRE_OPTIONS)[number][]> = {
  12: ["Aventura"],
  14: ["Fantasía"],
  16: ["Animación"],
  18: ["Drama"],
  27: ["Terror"],
  28: ["Acción"],
  35: ["Comedia"],
  36: ["Historia"],
  37: ["Western"],
  53: ["Thriller"],
  80: ["Crimen"],
  99: ["Documental"],
  878: ["Ciencia ficción"],
  9648: ["Misterio"],
  10402: ["Música"],
  10749: ["Romance"],
  10751: ["Familiar"],
  10752: ["Bélico"],
  10759: ["Acción", "Aventura"],
  10762: ["Infantil"],
  10763: ["Noticias"],
  10764: ["Reality"],
  10765: ["Ciencia ficción", "Fantasía"],
  10766: ["Telenovela"],
  10767: ["Talk show"],
  10768: ["Bélico", "Política"],
  10770: ["Telefilme"],
};

export type ItemTipo = "movie" | "series" | "anime" | "youtube";

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  tipo: ItemTipo;
}

export interface FormFillData {
  titulo: string;
  descripcion?: string;
  posterUrl?: string;
  url?: string;
  generos?: string[];
  tags?: string[];
}

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

interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
}

interface TmdbWatchProviderRegion {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

interface TmdbWatchProvidersResponse {
  results?: Record<string, TmdbWatchProviderRegion | undefined>;
}

interface KitsuTitleMap {
  en?: string;
  en_jp?: string;
  en_us?: string;
  ja_jp?: string;
}

interface KitsuPosterImage {
  tiny?: string;
  small?: string;
  medium?: string;
  large?: string;
  original?: string;
}

interface KitsuAnimeAttributes {
  canonicalTitle?: string;
  titles?: KitsuTitleMap;
  synopsis?: string;
  description?: string;
  averageRating?: string;
  episodeCount?: number | null;
  posterImage?: KitsuPosterImage;
  startDate?: string;
}

interface KitsuRelationshipRef {
  id: string;
  type: string;
}

interface KitsuRelationship {
  data?: KitsuRelationshipRef | KitsuRelationshipRef[] | null;
}

interface KitsuIncludedItem {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, KitsuRelationship | undefined>;
}

interface KitsuAnimeItem {
  id: string;
  type: "anime";
  attributes?: KitsuAnimeAttributes;
  relationships?: {
    genres?: { data?: KitsuRelationshipRef[] };
    categories?: { data?: KitsuRelationshipRef[] };
    streamingLinks?: { data?: KitsuRelationshipRef[] };
  };
}

interface KitsuAnimeResponse {
  data?: KitsuAnimeItem[];
}

interface KitsuAnimeDetailsResponse {
  data?: KitsuAnimeItem;
  included?: KitsuIncludedItem[];
}

interface YoutubeOEmbedResponse {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
}

function tmdbImage(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function normalizeProviderName(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isPreferredStreamer(value: string | undefined): boolean {
  const normalized = normalizeProviderName(value);
  return PRIORITY_STREAMERS.some((provider) => normalized.includes(provider));
}

function getYearTag(value: string | number | null | undefined): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.slice(0, 4);
  return undefined;
}

function getKitsuTitle(attributes: KitsuAnimeAttributes | undefined): string {
  return (
    attributes?.titles?.en
    ?? attributes?.titles?.en_us
    ?? attributes?.canonicalTitle
    ?? attributes?.titles?.en_jp
    ?? attributes?.titles?.ja_jp
    ?? ""
  );
}

function getKitsuPoster(poster: KitsuPosterImage | undefined): string | undefined {
  return poster?.large ?? poster?.medium ?? poster?.small ?? poster?.tiny ?? poster?.original;
}

function mapExternalGenreLabel(label: string): readonly string[] | undefined {
  const normalized = normalizeProviderName(label);
  return ANIME_GENRE_LABELS[normalized as keyof typeof ANIME_GENRE_LABELS];
}

function mapTmdbGenres(genres: TmdbGenre[] | undefined): { generos: string[]; extraTags: string[] } {
  const generos = new Set<string>();
  const extraTags = new Set<string>();

  for (const genre of genres ?? []) {
    const mapped = TMDB_GENRE_ID_LABELS[genre.id];
    if (mapped?.length) {
      mapped.forEach((value: string) => generos.add(value));
    } else if (genre.name?.trim()) {
      extraTags.add(genre.name.trim());
    }
  }

  return { generos: [...generos], extraTags: [...extraTags] };
}

function extractYoutubeUrl(text: string): string | null {
  const trimmed = text.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[0].startsWith("http") ? match[0] : `https://www.youtube.com/watch?v=${match[1]}`;
  }

  return null;
}

async function getTmdbWatchProviderUrl(tipo: "movie" | "tv", id: string): Promise<string | undefined> {
  if (!TMDB_KEY?.trim()) return undefined;

  const res = await fetch(`${TMDB_BASE}/${tipo}/${id}/watch/providers?api_key=${TMDB_KEY}`);
  if (!res.ok) return undefined;

  const data: TmdbWatchProvidersResponse = await res.json();
  const regions = [data.results?.US, data.results?.MX].filter(Boolean) as TmdbWatchProviderRegion[];

  for (const region of regions) {
    const providers = [
      ...(region.flatrate ?? []),
      ...(region.free ?? []),
      ...(region.ads ?? []),
      ...(region.rent ?? []),
      ...(region.buy ?? []),
    ];

    if (providers.some((provider) => isPreferredStreamer(provider.provider_name))) {
      return region.link?.trim() || undefined;
    }
  }

  return undefined;
}

async function searchTmdbBestMatchForAnime(title: string, year?: string): Promise<{ tipo: "movie" | "tv"; id: string } | null> {
  if (!TMDB_KEY?.trim()) return null;

  const query = encodeURIComponent(title.trim());
  if (!query) return null;

  const tvUrl = `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&language=es-ES&query=${query}&page=1${year ? `&first_air_date_year=${encodeURIComponent(year)}` : ""}`;
  const movieUrl = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=es-ES&query=${query}&page=1${year ? `&year=${encodeURIComponent(year)}` : ""}`;

  const [tvRes, movieRes] = await Promise.all([fetch(tvUrl), fetch(movieUrl)]);
  const tvData = tvRes.ok ? await tvRes.json() : {};
  const movieData = movieRes.ok ? await movieRes.json() : {};

  const tvResults: TmdbSearchResult[] = tvData.results ?? [];
  const movieResults: TmdbSearchResult[] = movieData.results ?? [];
  const tvFirst = tvResults[0];
  const movieFirst = movieResults[0];

  if (tvFirst?.id) return { tipo: "tv", id: String(tvFirst.id) };
  if (movieFirst?.id) return { tipo: "movie", id: String(movieFirst.id) };
  return null;
}

async function getStreamingUrlForAnime(title: string, year?: string): Promise<string | undefined> {
  const match = await searchTmdbBestMatchForAnime(title, year);
  if (!match) return undefined;
  return getTmdbWatchProviderUrl(match.tipo, match.id);
}

function pickKitsuStreamingUrl(details: KitsuAnimeDetailsResponse): string | undefined {
  const included = details.included ?? [];
  const streamerNames = new Map<string, string>();
  const streamingLinks = new Map<string, KitsuIncludedItem>();

  for (const item of included) {
    if (item.type === "streamers") {
      const siteName = typeof item.attributes?.siteName === "string" ? item.attributes.siteName : undefined;
      if (siteName) streamerNames.set(item.id, siteName);
    }
    if (item.type === "streamingLinks") {
      streamingLinks.set(item.id, item);
    }
  }

  const orderedLinks = details.data?.relationships?.streamingLinks?.data ?? [];
  for (const ref of orderedLinks) {
    const item = streamingLinks.get(ref.id);
    const url = typeof item?.attributes?.url === "string" ? item.attributes.url : undefined;
    const streamerRef = item?.relationships?.streamer?.data;
    const streamer = streamerRef && !Array.isArray(streamerRef) ? streamerNames.get(streamerRef.id) : undefined;
    if (url && isPreferredStreamer(streamer ?? url)) return url;
  }

  return undefined;
}

export async function searchTmdbMovies(query: string): Promise<SearchSuggestion[]> {
  if (!TMDB_KEY?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  if (!q) return [];

  const res = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=es-ES&query=${q}&page=1`);
  if (!res.ok) return [];

  const data = await res.json();
  const results: TmdbSearchResult[] = data.results ?? [];

  return results.slice(0, 8).map((result) => ({
    id: String(result.id),
    title: result.title ?? "",
    subtitle: result.release_date ? result.release_date.slice(0, 4) : undefined,
    posterUrl: tmdbImage(result.poster_path),
    tipo: "movie" as const,
  }));
}

export async function searchTmdbTv(query: string): Promise<SearchSuggestion[]> {
  if (!TMDB_KEY?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  if (!q) return [];

  const res = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&language=es-ES&query=${q}&page=1`);
  if (!res.ok) return [];

  const data = await res.json();
  const results: TmdbSearchResult[] = data.results ?? [];

  return results.slice(0, 8).map((result) => ({
    id: String(result.id),
    title: result.name ?? "",
    subtitle: result.first_air_date ? result.first_air_date.slice(0, 4) : undefined,
    posterUrl: tmdbImage(result.poster_path),
    tipo: "series" as const,
  }));
}

export async function getTmdbMovieDetails(id: string): Promise<FormFillData | null> {
  if (!TMDB_KEY?.trim()) return null;

  const res = await fetch(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=es-ES`);
  if (!res.ok) return null;

  const result: TmdbDetailsResponse = await res.json();
  const tags: string[] = [];
  const yearTag = getYearTag(result.release_date);
  const providerUrl = await getTmdbWatchProviderUrl("movie", id);
  const { generos, extraTags } = mapTmdbGenres(result.genres);

  if (yearTag) tags.push(yearTag);
  tags.push(...extraTags);

  return {
    titulo: result.title ?? "",
    descripcion: result.overview?.trim() || undefined,
    posterUrl: tmdbImage(result.poster_path),
    url: providerUrl ?? result.homepage?.trim() ?? undefined,
    generos,
    tags: tags.length ? tags : undefined,
  };
}

export async function getTmdbTvDetails(id: string): Promise<FormFillData | null> {
  if (!TMDB_KEY?.trim()) return null;

  const res = await fetch(`${TMDB_BASE}/tv/${id}?api_key=${TMDB_KEY}&language=es-ES`);
  if (!res.ok) return null;

  const result: TmdbDetailsResponse = await res.json();
  const tags: string[] = [];
  const yearTag = getYearTag(result.first_air_date);
  const providerUrl = await getTmdbWatchProviderUrl("tv", id);
  const { generos, extraTags } = mapTmdbGenres(result.genres);

  if (yearTag) tags.push(yearTag);
  tags.push(...extraTags);

  return {
    titulo: result.name ?? "",
    descripcion: result.overview?.trim() || undefined,
    posterUrl: tmdbImage(result.poster_path),
    url: providerUrl ?? result.homepage?.trim() ?? undefined,
    generos,
    tags: tags.length ? tags : undefined,
  };
}

export async function searchKitsuAnime(query: string): Promise<SearchSuggestion[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];

  const res = await fetch(`${KITSU_BASE}/anime?filter[text]=${q}&page[limit]=8`);
  if (!res.ok) return [];

  const data: KitsuAnimeResponse = await res.json();
  const results = data.data ?? [];

  return results.map((item) => ({
    id: item.id,
    title: getKitsuTitle(item.attributes),
    subtitle: getYearTag(item.attributes?.startDate),
    posterUrl: getKitsuPoster(item.attributes?.posterImage),
    tipo: "anime" as const,
  }));
}

export async function getKitsuAnimeDetails(id: string): Promise<FormFillData | null> {
  const res = await fetch(`${KITSU_BASE}/anime/${id}?include=genres,categories,streamingLinks,streamingLinks.streamer`);
  if (!res.ok) return null;

  const data: KitsuAnimeDetailsResponse = await res.json();
  const anime = data.data?.attributes;
  if (!anime) return null;

  const title = getKitsuTitle(anime);
  const tags: string[] = [];
  const mappedGenres = new Set<string>();
  const extraTags = new Set<string>();
  const yearTag = getYearTag(anime.startDate);

  if (yearTag) tags.push(yearTag);

  for (const item of data.included ?? []) {
    if (item.type !== "genres" && item.type !== "categories") continue;
    const rawLabel =
      item.type === "genres"
        ? typeof item.attributes?.name === "string"
          ? item.attributes.name
          : undefined
        : typeof item.attributes?.title === "string"
          ? item.attributes.title
          : undefined;

    if (!rawLabel) continue;
    const mapped = mapExternalGenreLabel(rawLabel);
    if (mapped?.length) {
      mapped.forEach((value) => mappedGenres.add(value));
    }
    else extraTags.add(rawLabel);
  }

  tags.push(...extraTags);

  const directStreamingUrl = pickKitsuStreamingUrl(data);
  const fallbackStreamingUrl = directStreamingUrl ? undefined : await getStreamingUrlForAnime(title, yearTag);

  return {
    titulo: title,
    descripcion: anime.synopsis?.trim() || anime.description?.trim() || undefined,
    posterUrl: getKitsuPoster(anime.posterImage),
    url: directStreamingUrl ?? fallbackStreamingUrl,
    generos: [...mappedGenres],
    tags: tags.length ? tags : undefined,
  };
}

export async function getYoutubeFromUrl(input: string): Promise<FormFillData | null> {
  const url = extractYoutubeUrl(input);
  if (!url) return null;

  try {
    const res = await fetch(`${YT_OEMBED}?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;

    const data: YoutubeOEmbedResponse = await res.json();
    const tags: string[] = [];
    if (data.author_name) tags.push(data.author_name);

    return {
      titulo: data.title ?? "",
      posterUrl: data.thumbnail_url ?? undefined,
      url,
      tags: tags.length ? tags : undefined,
    };
  } catch {
    return null;
  }
}

export function isTmdbConfigured(): boolean {
  return !!TMDB_KEY?.trim();
}
