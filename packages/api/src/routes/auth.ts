import { Hono } from "hono";
import { z } from "zod";
import { validateLogin, createSession, getSessionHeader, revokeSession } from "../lib/auth";
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
      return c.json({ error: "Email y contraseña requeridos" }, 400);
    }
    const { email, password } = parsed.data;
    if (!validateLogin(c.env, email, password)) {
      return c.json({ error: "Credenciales incorrectas" }, 401);
    }
    const token = await createSession(c);
    return c.json(
      { ok: true, session: token },
      { headers: { [getSessionHeader()]: token } }
    );
  })
  .post("/logout", async (c) => {
    await revokeSession(c);
    return c.json({ ok: true });
  });
