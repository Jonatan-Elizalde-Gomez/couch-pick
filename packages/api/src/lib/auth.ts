/**
 * Login por lista de correos permitidos + contrasena compartida (configurable).
 * Sin codigos por email: solo los correos en ALLOWED_EMAILS con APP_PASSWORD.
 * Sesiones en KV (14 dias). Cambiar contrasena: wrangler secret put APP_PASSWORD
 */
import type { Context } from "hono";
import type { Env } from "../bindings";

const SESSION_HEADER = "x-couchpick-session";
const SESSION_PREFIX = "session:";
const SESSION_TTL = 14 * 24 * 60 * 60; // 14 dias

// Fallback si no hay ALLOWED_EMAILS ni APP_PASSWORD (desarrollo)
const MOCK_EMAIL = "couch@pick.dev";
const MOCK_PASSWORD = "couchpick";

function getAllowedEmails(env: Env): string[] {
  if (!env.ALLOWED_EMAILS?.trim()) return [];
  return env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function buildSessionExpiryDate(): string {
  return new Date(Date.now() + SESSION_TTL * 1000).toISOString();
}

function buildSessionPayload() {
  return JSON.stringify({
    createdAt: new Date().toISOString(),
    expiresAt: buildSessionExpiryDate(),
  });
}

async function persistSession(env: Env, token: string): Promise<void> {
  await env.CACHE.put(SESSION_PREFIX + token, buildSessionPayload(), { expirationTtl: SESSION_TTL });
}

export function validateLogin(env: Env, email: string, password: string): boolean {
  const allowed = getAllowedEmails(env);
  const appPassword = env.APP_PASSWORD;
  if (allowed.length > 0 && appPassword) {
    return allowed.includes(email.trim().toLowerCase()) && password === appPassword;
  }
  return email === MOCK_EMAIL && password === MOCK_PASSWORD;
}

export async function createSession(c: Context<{ Bindings: Env }>): Promise<string> {
  const token = crypto.randomUUID();
  await persistSession(c.env, token);
  return token;
}

export async function requireAuth(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  const token = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!token) return c.json({ error: "No autorizado" }, 401);
  const found = await c.env.CACHE.get(SESSION_PREFIX + token);
  if (!found) return c.json({ error: "No autorizado" }, 401);
  return null;
}

export async function rotateSession(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!token) return null;

  const found = await c.env.CACHE.get(SESSION_PREFIX + token);
  if (!found) return null;

  const nextToken = crypto.randomUUID();
  await persistSession(c.env, nextToken);
  await c.env.CACHE.delete(SESSION_PREFIX + token);
  return nextToken;
}

export async function revokeSession(c: Context<{ Bindings: Env }>): Promise<void> {
  const token = c.req.header(SESSION_HEADER);
  if (token) await c.env.CACHE.delete(SESSION_PREFIX + token);
}

export function getSessionHeader(): string {
  return SESSION_HEADER;
}

export function getSessionExpiryDate(): string {
  return buildSessionExpiryDate();
}
