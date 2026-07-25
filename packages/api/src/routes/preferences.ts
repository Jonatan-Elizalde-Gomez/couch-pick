import { Hono } from "hono";
import { z } from "zod";
import { getSessionEmail, requireAuth } from "../lib/auth";
import {
  DEFAULT_FILTER_PREFERENCES,
  getFilterPreferences,
  saveFilterPreferences,
  type FilterPreferences,
} from "../lib/filterPreferences";
import type { Env } from "../bindings";

const preferencesSchema = z.object({
  autoApply: z.boolean().optional(),
  soloNoVistos: z.boolean().optional(),
});

export const preferencesRouter = new Hono<{ Bindings: Env }>();

preferencesRouter.use("*", async (c, next) => {
  const err = await requireAuth(c);
  if (err) return err;
  return next();
});

preferencesRouter.get("/filters", async (c) => {
  const email = await getSessionEmail(c);
  if (!email) return c.json({ error: "No autorizado" }, 401);

  const preferences = await getFilterPreferences(c.env, email);
  return c.json({ preferences });
});

preferencesRouter.put("/filters", async (c) => {
  const email = await getSessionEmail(c);
  if (!email) return c.json({ error: "No autorizado" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Preferencias inválidas", detail: parsed.error.flatten() }, 400);
  }

  const nextPreferences: FilterPreferences = {
    autoApply: parsed.data.autoApply ?? DEFAULT_FILTER_PREFERENCES.autoApply,
    soloNoVistos: parsed.data.soloNoVistos ?? DEFAULT_FILTER_PREFERENCES.soloNoVistos,
  };

  await saveFilterPreferences(c.env, email, nextPreferences);

  return c.json({ preferences: nextPreferences });
});
