import { Hono } from "hono";
import { z } from "zod";
import {
  validateLogin,
  createSession,
  getSessionHeader,
  getSessionExpiryDate,
  revokeSession,
  rotateSession,
} from "../lib/auth";
import type { Env } from "../bindings";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export const auth = new Hono<{ Bindings: Env }>()
  .post("/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Email y contrasena requeridos" }, 400);
    }

    const { email, password } = parsed.data;
    if (!validateLogin(c.env, email, password)) {
      return c.json({ error: "Credenciales incorrectas" }, 401);
    }

    const token = await createSession(c, email);
    const expiresAt = getSessionExpiryDate();
    return c.json(
      { ok: true, session: token, expiresAt },
      { headers: { [getSessionHeader()]: token } }
    );
  })
  .post("/refresh", async (c) => {
    const token = await rotateSession(c);
    if (!token) {
      return c.json({ error: "No autorizado" }, 401);
    }

    const expiresAt = getSessionExpiryDate();
    return c.json(
      { ok: true, session: token, expiresAt },
      { headers: { [getSessionHeader()]: token } }
    );
  })
  .post("/logout", async (c) => {
    await revokeSession(c);
    return c.json({ ok: true });
  });
