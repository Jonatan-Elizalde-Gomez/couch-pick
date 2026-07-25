import { Capacitor } from "@capacitor/core";

const API_BASE = (() => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredApiUrl) return configuredApiUrl;

  // Native apps do not have Vite's /api proxy available, so they need an absolute backend URL.
  if (Capacitor.isNativePlatform()) {
    return "https://couchpick-api.testpos.workers.dev";
  }

  return "/api";
})();
const SESSION_STORAGE_KEY = "couchpick-session";
const AUTH_INVALIDATED_EVENT = "couchpick:auth-invalidated";
const REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

type SessionState = {
  token: string;
  expiresAt: string;
};

let refreshPromise: Promise<string | null> | null = null;

function getSessionStorages(): Storage[] {
  return [sessionStorage, localStorage];
}

function clearStoredSession(emitEvent = true) {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  if (emitEvent) window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT));
}

function readSessionFromStorage(storage: Storage): SessionState | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState> | string;
    if (typeof parsed === "string") {
      return { token: parsed, expiresAt: new Date(Date.now() + REFRESH_WINDOW_MS).toISOString() };
    }
    if (!parsed.token || !parsed.expiresAt) return null;
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return { token: raw, expiresAt: new Date(Date.now() + REFRESH_WINDOW_MS).toISOString() };
  }
}

function shouldRefresh(session: SessionState): boolean {
  return new Date(session.expiresAt).getTime() - Date.now() <= REFRESH_WINDOW_MS;
}

function applySessionFromResponse(res: Response) {
  const token = res.headers.get("x-couchpick-session");
  if (!token) return;

  res
    .clone()
    .json()
    .then((data) => {
      const expiresAt = (data as { expiresAt?: string }).expiresAt;
      const shouldRemember = !!localStorage.getItem(SESSION_STORAGE_KEY);
      setSession(token, expiresAt ?? new Date(Date.now() + REFRESH_WINDOW_MS).toISOString(), shouldRemember);
    })
    .catch(() => {
      const shouldRemember = !!localStorage.getItem(SESSION_STORAGE_KEY);
      setSession(token, new Date(Date.now() + REFRESH_WINDOW_MS).toISOString(), shouldRemember);
    });
}

export function getAuthInvalidatedEventName(): string {
  return AUTH_INVALIDATED_EVENT;
}

export function getSession(): SessionState | null {
  for (const storage of getSessionStorages()) {
    const session = readSessionFromStorage(storage);
    if (session) return session;
  }
  return null;
}

export function setSession(token: string | null, expiresAt?: string | null, remember = false) {
  if (!token) {
    clearStoredSession(false);
    return;
  }

  const targetStorage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;
  otherStorage.removeItem(SESSION_STORAGE_KEY);
  targetStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      token,
      expiresAt: expiresAt ?? new Date(Date.now() + REFRESH_WINDOW_MS).toISOString(),
    } satisfies SessionState)
  );
}

export async function refreshSession(): Promise<string | null> {
  const current = getSession();
  if (!current) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(API_BASE + "/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-couchpick-session": current.token,
    },
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        clearStoredSession();
        return null;
      }

      const token = (res.headers.get("x-couchpick-session") ?? (data as { session?: string }).session) ?? null;
      const expiresAt = (data as { expiresAt?: string }).expiresAt ?? null;
      if (!token) {
        clearStoredSession();
        return null;
      }

      const remember = !!localStorage.getItem(SESSION_STORAGE_KEY);
      setSession(token, expiresAt, remember);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function fetchApi(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  let activeSession = getSession();
  if (activeSession && path !== "/auth/refresh" && shouldRefresh(activeSession)) {
    await refreshSession();
    activeSession = getSession();
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (activeSession?.token) (headers as Record<string, string>)["x-couchpick-session"] = activeSession.token;

  const res = await fetch(API_BASE + path, { ...options, headers });
  applySessionFromResponse(res);

  if (res.status === 401 && retryOnUnauthorized && path !== "/auth/refresh" && activeSession?.token) {
    const nextToken = await refreshSession();
    if (nextToken) {
      return fetchApi(path, options, false);
    }
  }

  if (res.status === 401) {
    clearStoredSession();
  }

  return res;
}

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetchApi(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
  return data as T;
}
