/**
 * Login por lista de correos permitidos + contrasena compartida.
 * Sesiones stateless firmadas para no depender de KV.
 */
import type { Context } from "hono";
import type { Env } from "../bindings";

const SESSION_HEADER = "x-couchpick-session";
const SESSION_TTL = 14 * 24 * 60 * 60; // 14 dias

const MOCK_EMAIL = "couch@pick.dev";
const MOCK_PASSWORD = "couchpick";

type SessionPayload = {
  email: string;
  createdAt: string;
  expiresAt: string;
  nonce: string;
};

export function getAllowedEmails(env: Env): string[] {
  if (!env.ALLOWED_EMAILS?.trim()) return [];
  return env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedEmail(env: Env, email: string): boolean {
  return getAllowedEmails(env).includes(normalizeSessionEmail(email));
}

function buildSessionExpiryDate(): string {
  return new Date(Date.now() + SESSION_TTL * 1000).toISOString();
}

function normalizeSessionEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getSessionSecret(env: Env): string {
  return env.APP_PASSWORD?.trim() || MOCK_PASSWORD;
}

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

async function signValue(env: Env, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return toBase64Url(binary);
}

async function encodeSession(env: Env, payload: SessionPayload): Promise<string> {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = await signValue(env, body);
  return `${body}.${signature}`;
}

export async function decodeSessionToken(env: Env, token: string): Promise<SessionPayload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = await signValue(env, body);
  if (signature !== expected) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(body)) as Partial<SessionPayload>;
    if (!parsed.email || !parsed.createdAt || !parsed.expiresAt || !parsed.nonce) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;

    return {
      email: normalizeSessionEmail(parsed.email),
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}

export function validateLogin(env: Env, email: string, password: string): boolean {
  const allowed = getAllowedEmails(env);
  const appPassword = env.APP_PASSWORD;
  if (allowed.length > 0 && appPassword) {
    return allowed.includes(email.trim().toLowerCase()) && password === appPassword;
  }
  return email === MOCK_EMAIL && password === MOCK_PASSWORD;
}

export async function createSession(c: Context<{ Bindings: Env }>, email: string): Promise<string> {
  return encodeSession(c.env, {
    email: normalizeSessionEmail(email),
    createdAt: new Date().toISOString(),
    expiresAt: buildSessionExpiryDate(),
    nonce: crypto.randomUUID(),
  });
}

export async function requireAuth(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  const token = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!token) return c.json({ error: "No autorizado" }, 401);
  const payload = await decodeSessionToken(c.env, token);
  if (!payload) return c.json({ error: "No autorizado" }, 401);
  return null;
}

export async function rotateSession(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!token) return null;

  const payload = await decodeSessionToken(c.env, token);
  if (!payload) return null;

  return encodeSession(c.env, {
    email: payload.email,
    createdAt: payload.createdAt,
    expiresAt: buildSessionExpiryDate(),
    nonce: crypto.randomUUID(),
  });
}

export async function revokeSession(_c: Context<{ Bindings: Env }>): Promise<void> {
  // Stateless token: el cliente lo elimina localmente.
}

export function getSessionHeader(): string {
  return SESSION_HEADER;
}

export function getSessionExpiryDate(): string {
  return buildSessionExpiryDate();
}

export async function getSessionEmail(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = c.req.header(SESSION_HEADER) ?? c.req.query("session");
  if (!token) return null;
  const payload = await decodeSessionToken(c.env, token);
  return payload?.email ?? null;
}
