import { fetchApi, refreshSession, setSession } from "./client";

export type LoginBody = { email: string; password: string; remember?: boolean };

export async function login(body: LoginBody): Promise<{ ok: boolean; session: string; expiresAt: string }> {
  const res = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error al iniciar sesion");

  const session = (res.headers.get("x-couchpick-session") ?? (data as { session?: string }).session) as string;
  const expiresAt = ((data as { expiresAt?: string }).expiresAt ?? new Date().toISOString()) as string;
  if (session) setSession(session, expiresAt, !!body.remember);
  return { ok: true, session, expiresAt };
}

export async function restoreSession(): Promise<boolean> {
  const session = await refreshSession();
  return !!session;
}

export async function logout() {
  try {
    await fetchApi("/auth/logout", { method: "POST" }, false);
  } finally {
    setSession(null);
  }
}
