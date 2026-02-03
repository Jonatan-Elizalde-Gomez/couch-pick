import { fetchApi, fetchJson } from "./client";

export type ItemTipo = "movie" | "series" | "anime" | "youtube";

export interface Item {
  id: string;
  tipo: ItemTipo;
  titulo: string;
  descripcion: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  url: string | null;
  visto: boolean;
  externalId: string | null;
  createdAt: string | number;
  updatedAt: string | number;
  tags?: string[];
  generos?: string[];
}

export interface ItemCreate {
  tipo: ItemTipo;
  titulo: string;
  descripcion?: string;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  url?: string | null;
  generos?: string[];
  tags?: string[];
  visto?: boolean;
}

export interface ItemUpdate extends Partial<ItemCreate> {}

export interface ShuffleFilters {
  tipo?: ItemTipo[];
  tipoExcluir?: ItemTipo[];
  soloNoVistos?: boolean;
  tag?: string[];
  tagExcluir?: string[];
  genero?: string[];
  generoExcluir?: string[];
}

export function itemsListParams(filters: ShuffleFilters & { visto?: boolean }): string {
  const p = new URLSearchParams();
  filters.tipo?.forEach((t) => p.append("tipo", t));
  filters.tipoExcluir?.forEach((t) => p.append("tipoExcluir", t));
  if (filters.visto !== undefined) p.set("visto", String(filters.visto));
  if (filters.soloNoVistos) p.set("soloNoVistos", "true");
  filters.tag?.forEach((t) => p.append("tag", t));
  filters.tagExcluir?.forEach((t) => p.append("tagExcluir", t));
  filters.genero?.forEach((g) => p.append("genero", g));
  filters.generoExcluir?.forEach((g) => p.append("generoExcluir", g));
  return p.toString();
}

export interface ItemsPageResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getItems(filters: ShuffleFilters & { visto?: boolean } = {}): Promise<Item[]> {
  const q = itemsListParams(filters);
  return fetchJson<Item[]>(`/items?${q}`);
}

export async function getItemsPaginated(
  filters: ShuffleFilters & { visto?: boolean },
  page: number,
  limit: number
): Promise<ItemsPageResponse> {
  const q = itemsListParams(filters);
  const p = new URLSearchParams(q);
  p.set("page", String(page));
  p.set("limit", String(limit));
  return fetchJson<ItemsPageResponse>(`/items?${p.toString()}`);
}

export async function exportBackup(): Promise<Item[]> {
  return fetchJson<Item[]>("/items/export");
}

export async function importBackup(items: Item[]): Promise<{ ok: boolean; imported: number }> {
  const res = await fetchApi("/items/import", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error al importar");
  return data as { ok: boolean; imported: number };
}

export async function getItem(id: string): Promise<Item> {
  return fetchJson<Item>(`/items/${id}`);
}

export async function createItem(body: ItemCreate): Promise<Item> {
  const res = await fetchApi("/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
  return data as Item;
}

export async function updateItem(id: string, body: ItemUpdate): Promise<Item> {
  const res = await fetchApi(`/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
  return data as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const res = await fetchApi(`/items/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Error");
  }
}

export async function shuffle(filters: ShuffleFilters = {}): Promise<{ item: Item }> {
  const q = itemsListParams(filters);
  return fetchJson<{ item: Item }>(`/shuffle?${q}`, { method: "POST" });
}
