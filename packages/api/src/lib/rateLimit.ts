import type { Context } from "hono";
import type { Env } from "../bindings";
import { decodeSessionToken, isAllowedEmail } from "./auth";

const WINDOW_SEC = 60;
const PREFIX_GLOBAL = "rl:g:";
const PREFIX_LOGIN = "rl:login:";
const PREFIX_HEALTH = "rl:h:";
const LIMIT_GLOBAL = 100;
const LIMIT_LOGIN = 10;
const LIMIT_HEALTH = 5;

function getWindow(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SEC);
}

function getClientIp(c: Context<{ Bindings: Env }>): string {
  const cf = c.req.raw.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = c.req.raw.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

async function checkLimit(
  kv: KVNamespace,
  key: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const raw = await kv.get(key);
  const count = Math.min(parseInt(raw ?? "0", 10), limit);
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  const next = count + 1;
  await kv.put(key, String(next), { expirationTtl: WINDOW_SEC * 2 });
  return { allowed: true, remaining: Math.max(0, limit - next) };
}

async function shouldBypassRateLimit(c: Context<{ Bindings: Env }>, path: string): Promise<boolean> {
  const token = c.req.header("x-couchpick-session") ?? c.req.query("session");
  if (token) {
    const payload = await decodeSessionToken(c.env, token);
    if (payload?.email && isAllowedEmail(c.env, payload.email)) {
      return true;
    }
  }

  if (path === "/auth/login") {
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await c.req.raw.clone().json().catch(() => null) as { email?: string } | null;
      if (body?.email && isAllowedEmail(c.env, body.email)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Rate limit middleware.
 * If KV fails for any reason, the app should keep serving traffic instead of returning 500s.
 */
export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env }>,
  next: () => Promise<void>
): Promise<Response | void> {
  try {
    const kv = c.env.CACHE;
    const path = new URL(c.req.url).pathname;
    const ip = getClientIp(c);
    const win = getWindow();

    if (await shouldBypassRateLimit(c, path)) {
      await next();
      return;
    }

    if (path === "/health") {
      const keyHealth = `${PREFIX_HEALTH}${win}:${ip}`;
      const { allowed } = await checkLimit(kv, keyHealth, LIMIT_HEALTH);
      if (!allowed) {
        return c.json(
          { error: "Limite de health superado. Espera un minuto." },
          429,
          {
            headers: {
              "Retry-After": String(WINDOW_SEC),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }

    if (path === "/auth/login") {
      const keyLogin = `${PREFIX_LOGIN}${win}:${ip}`;
      const { allowed } = await checkLimit(kv, keyLogin, LIMIT_LOGIN);
      if (!allowed) {
        return c.json(
          { error: "Demasiados intentos. Espera un minuto." },
          429,
          {
            headers: {
              "Retry-After": String(WINDOW_SEC),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }

    const keyGlobal = `${PREFIX_GLOBAL}${win}:${ip}`;
    const { allowed } = await checkLimit(kv, keyGlobal, LIMIT_GLOBAL);
    if (!allowed) {
      return c.json(
        { error: "Limite de solicitudes superado. Espera un minuto." },
        429,
        {
          headers: {
            "Retry-After": String(WINDOW_SEC),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  } catch (error) {
    console.error("rateLimitMiddleware failed; continuing without rate limit", error);
  }

  await next();
}
