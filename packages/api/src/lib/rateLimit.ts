import type { Context } from "hono";
import type { Env } from "../bindings";

const WINDOW_SEC = 60;
const PREFIX_GLOBAL = "rl:g:";
const PREFIX_AUTH = "rl:a:";
const PREFIX_HEALTH = "rl:h:";
const LIMIT_GLOBAL = 100;
const LIMIT_AUTH = 10;
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

/**
 * Rate limit middleware: global por IP y más estricto en /auth.
 * Usa KV (CACHE). Responde 429 si se supera el límite.
 * /health tiene su propio límite (5/min) además del global.
 */
export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env }>,
  next: () => Promise<void>
): Promise<Response | void> {
  const kv = c.env.CACHE;
  const path = new URL(c.req.url).pathname;
  const ip = getClientIp(c);
  const win = getWindow();

  if (path === "/health") {
    const keyHealth = `${PREFIX_HEALTH}${win}:${ip}`;
    const { allowed } = await checkLimit(kv, keyHealth, LIMIT_HEALTH);
    if (!allowed) {
      return c.json(
        { error: "Límite de health superado. Espera un minuto." },
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

  if (path.startsWith("/auth")) {
    const keyAuth = `${PREFIX_AUTH}${win}:${ip}`;
    const { allowed, remaining } = await checkLimit(kv, keyAuth, LIMIT_AUTH);
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
  const { allowed, remaining } = await checkLimit(kv, keyGlobal, LIMIT_GLOBAL);
  if (!allowed) {
    return c.json(
      { error: "Límite de solicitudes superado. Espera un minuto." },
      429,
      {
        headers: {
          "Retry-After": String(WINDOW_SEC),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  await next();
}
