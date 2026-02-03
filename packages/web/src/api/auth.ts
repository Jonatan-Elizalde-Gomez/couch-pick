import { fetchApi, setSession } from "./client";

export type LoginBody = { email: string; password: string; remember?: boolean };

export async function login(body: LoginBody): Promise<{ ok: boolean; session: string }> {
  const res = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error al iniciar sesión");
  const session = (res.headers.get("x-couchpick-session") ?? (data as { session?: string }).session) as string;
  if (session) setSession(session);
  return { ok: true, session };
}

export function logout() {
  setSession(null);
}
