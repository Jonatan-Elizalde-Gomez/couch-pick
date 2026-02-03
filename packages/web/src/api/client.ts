const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function getSession(): string | null {
  return localStorage.getItem("couchpick-session");
}

export function setSession(token: string | null) {
  if (token) localStorage.setItem("couchpick-session", token);
  else localStorage.removeItem("couchpick-session");
}

export async function fetchApi(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session) (headers as Record<string, string>)["x-couchpick-session"] = session;
  return fetch(API_BASE + path, { ...options, headers });
}

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetchApi(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
  return data as T;
}
