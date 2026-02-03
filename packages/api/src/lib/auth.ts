/**
 * MVP: login simulado. Si usas Cloudflare Access, el usuario ya viene autenticado
 * por cabeceras (CF-Access-*). Aquí simulamos con body email/password y
 * devolvemos un token de sesión simple (en producción: JWT o cookie HttpOnly).
 */
import type { Context } from "hono";

const MOCK_EMAIL = "couch@pick.dev";
const MOCK_PASSWORD = "couchpick";
const SESSION_HEADER = "x-couchpick-session";

export function requireAuth(c: Context) {
  const session = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!session || session !== "ok") {
    return c.json({ error: "No autorizado" }, 401);
  }
  return null;
}

export function mockLogin(email: string, password: string): boolean {
  return email === MOCK_EMAIL && password === MOCK_PASSWORD;
}

export function getSessionHeader(): string {
  return SESSION_HEADER;
}

export function createSession(): string {
  return "ok";
}
