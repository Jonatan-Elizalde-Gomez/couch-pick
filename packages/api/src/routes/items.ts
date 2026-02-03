import { Hono } from "hono";
import { z } from "zod";
import { eq, and, inArray, not, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { Env } from "../bindings";
import { getDb } from "../db";
import { items, tags, itemTags, itemGeneros } from "../db/schema";

const tipoEnum = z.enum(["movie", "series", "anime", "youtube"]);

const createItemSchema = z.object({
  tipo: tipoEnum,
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  url: z.string().optional().nullable(),
  generos: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  visto: z.boolean().optional(),
});

const updateItemSchema = createItemSchema.partial();

function nanoid() {
  return crypto.randomUUID?.() ?? "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

export const itemsRouter = new Hono<{ Bindings: Env }>();

itemsRouter.use("*", (c, next) => {
  const err = requireAuth(c);
  if (err) return err;
  return next();
});

function getQueryArray(url: URL, key: string): string[] {
  const raw = url.searchParams.getAll(key);
  return raw.flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
}

itemsRouter.get("/", async (c) => {
  const url = new URL(c.req.url);
  const tipos = getQueryArray(url, "tipo");
  const tipoExcluir = getQueryArray(url, "tipoExcluir");
  const visto = c.req.query("visto");
  const tagsFilter = getQueryArray(url, "tag");
  const tagsExcluir = getQueryArray(url, "tagExcluir");
  const generos = getQueryArray(url, "genero");
  const generosExcluir = getQueryArray(url, "generoExcluir");
  const soloNoVistos = c.req.query("soloNoVistos") === "true";

  const db = getDb(c.env.DB);
  let q = db.select().from(items);

  const conditions = [];
  if (tipos.length > 0) conditions.push(inArray(items.tipo, tipos as any));
  if (tipoExcluir.length > 0) conditions.push(not(inArray(items.tipo, tipoExcluir as any)));
  if (visto !== undefined && visto !== "") conditions.push(eq(items.visto, visto === "true"));
  if (soloNoVistos) conditions.push(eq(items.visto, false));

  if (conditions.length) {
    q = db.select().from(items).where(and(...conditions)) as any;
  }

  const allItems = await q;
  let result = allItems;

  /* Géneros: OR — el ítem debe tener AL MENOS UNO de los géneros seleccionados */
  if (generos.length > 0) {
    const idsWithAnyGen = new Set<string>();
    for (const genero of generos) {
      const rows = await db
        .select({ itemId: itemGeneros.itemId })
        .from(itemGeneros)
        .where(eq(itemGeneros.genero, genero));
      rows.forEach((r) => idsWithAnyGen.add(r.itemId));
    }
    result = result.filter((i) => idsWithAnyGen.has(i.id));
  }

  /* Géneros excluir: el ítem NO debe tener ninguno de estos géneros */
  if (generosExcluir.length > 0) {
    const idsWithExclGen = new Set<string>();
    for (const genero of generosExcluir) {
      const rows = await db
        .select({ itemId: itemGeneros.itemId })
        .from(itemGeneros)
        .where(eq(itemGeneros.genero, genero));
      rows.forEach((r) => idsWithExclGen.add(r.itemId));
    }
    result = result.filter((i) => !idsWithExclGen.has(i.id));
  }

  /* Tags: OR — el ítem debe tener AL MENOS UNO de los tags seleccionados */
  if (tagsFilter.length > 0) {
    const idsWithAnyTag = new Set<string>();
    for (const tag of tagsFilter) {
      const rows = await db
        .select({ itemId: itemTags.itemId })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(eq(tags.name, tag));
      rows.forEach((r) => idsWithAnyTag.add(r.itemId));
    }
    result = result.filter((i) => idsWithAnyTag.has(i.id));
  }

  /* Tags excluir: el ítem NO debe tener ninguno de estos tags */
  if (tagsExcluir.length > 0) {
    const idsWithExclTag = new Set<string>();
    for (const tag of tagsExcluir) {
      const rows = await db
        .select({ itemId: itemTags.itemId })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(eq(tags.name, tag));
      rows.forEach((r) => idsWithExclTag.add(r.itemId));
    }
    result = result.filter((i) => !idsWithExclTag.has(i.id));
  }

  const withMeta = await Promise.all(
    result.map(async (item) => {
      const [tagRows, genRows] = await Promise.all([
        db
          .select({ name: tags.name })
          .from(itemTags)
          .innerJoin(tags, eq(itemTags.tagId, tags.id))
          .where(eq(itemTags.itemId, item.id)),
        db.select({ genero: itemGeneros.genero }).from(itemGeneros).where(eq(itemGeneros.itemId, item.id)),
      ]);
      return {
        ...item,
        tags: tagRows.map((r) => r.name),
        generos: genRows.map((r) => r.genero),
      };
    })
  );

  const pageParam = c.req.query("page");
  const limitParam = c.req.query("limit");
  if (pageParam != null && limitParam != null) {
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const total = withMeta.length;
    const start = (page - 1) * limit;
    const items = withMeta.slice(start, start + limit);
    return c.json({ items, total, page, limit, hasMore: start + items.length < total });
  }

  return c.json(withMeta);
});

/** GET /items/export — respaldo completo (todos los ítems con tags y géneros). Sin filtros. */
itemsRouter.get("/export", async (c) => {
  const db = getDb(c.env.DB);
  const allItems = await db.select().from(items);
  const withMeta = await Promise.all(
    allItems.map(async (item) => {
      const [tagRows, genRows] = await Promise.all([
        db.select({ name: tags.name }).from(itemTags).innerJoin(tags, eq(itemTags.tagId, tags.id)).where(eq(itemTags.itemId, item.id)),
        db.select({ genero: itemGeneros.genero }).from(itemGeneros).where(eq(itemGeneros.itemId, item.id)),
      ]);
      return {
        ...item,
        tags: tagRows.map((r) => r.name),
        generos: genRows.map((r) => r.genero),
      };
    })
  );
  return c.json(withMeta);
});

const importItemSchema = z.object({
  id: z.string(),
  tipo: tipoEnum,
  titulo: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  url: z.string().optional().nullable(),
  visto: z.boolean().optional(),
  externalId: z.string().optional().nullable(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
  tags: z.array(z.string()).optional(),
  generos: z.array(z.string()).optional(),
});

/** POST /items/import — restaura respaldo (reemplaza toda la BD). Body: { items: ExportItem[] } */
itemsRouter.post("/import", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = z.object({ items: z.array(importItemSchema) }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Formato inválido", detail: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DB);
  const now = new Date();

  await db.delete(itemTags);
  await db.delete(itemGeneros);
  await db.delete(items);

  for (const row of parsed.data.items) {
    const createdAt = row.createdAt != null ? new Date(row.createdAt as number) : now;
    const updatedAt = row.updatedAt != null ? new Date(row.updatedAt as number) : now;
    await db.insert(items).values({
      id: row.id,
      tipo: row.tipo,
      titulo: row.titulo,
      descripcion: row.descripcion ?? null,
      thumbnailUrl: row.thumbnailUrl ?? null,
      posterUrl: row.posterUrl ?? null,
      url: row.url ?? null,
      visto: row.visto ?? false,
      externalId: row.externalId ?? null,
      createdAt,
      updatedAt,
    });
    const tagNames = row.tags ?? [];
    const generos = row.generos ?? [];
    for (const name of tagNames) {
      let [tag] = await db.select().from(tags).where(eq(tags.name, name));
      if (!tag) {
        const tid = nanoid();
        await db.insert(tags).values({ id: tid, name, usageCount: 1 });
        await db.insert(itemTags).values({ itemId: row.id, tagId: tid });
      } else {
        await db.insert(itemTags).values({ itemId: row.id, tagId: tag.id });
      }
    }
    for (const g of generos) {
      await db.insert(itemGeneros).values({ itemId: row.id, genero: g });
    }
  }

  return c.json({ ok: true, imported: parsed.data.items.length });
});

itemsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item) return c.json({ error: "No encontrado" }, 404);
  const [tagRows, genRows] = await Promise.all([
    db.select({ name: tags.name }).from(itemTags).innerJoin(tags, eq(itemTags.tagId, tags.id)).where(eq(itemTags.itemId, id)),
    db.select({ genero: itemGeneros.genero }).from(itemGeneros).where(eq(itemGeneros.itemId, id)),
  ]);
  return c.json({
    ...item,
    tags: tagRows.map((r) => r.name),
    generos: genRows.map((r) => r.genero),
  });
});

itemsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const db = getDb(c.env.DB);
    const id = nanoid();
    const now = new Date();
    const data = {
      id,
      tipo: parsed.data.tipo,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion ?? null,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      posterUrl: parsed.data.posterUrl ?? null,
      url: parsed.data.url ?? null,
      visto: parsed.data.visto ?? false,
      externalId: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(items).values(data);

    const tagNames = parsed.data.tags ?? [];
    const generos = parsed.data.generos ?? [];
    for (const name of tagNames) {
      const [tag] = await db.select().from(tags).where(eq(tags.name, name));
      if (!tag) {
        const tid = nanoid();
        await db.insert(tags).values({ id: tid, name, usageCount: 1 });
        await db.insert(itemTags).values({ itemId: id, tagId: tid });
      } else {
        await db.insert(itemTags).values({ itemId: id, tagId: tag.id });
        await db.update(tags).set({ usageCount: sql`${tags.usageCount} + 1` }).where(eq(tags.id, tag.id));
      }
    }
    for (const g of generos) {
      await db.insert(itemGeneros).values({ itemId: id, genero: g });
    }

    const [created] = await db.select().from(items).where(eq(items.id, id));
    const [tagRows, genRows] = await Promise.all([
      db.select({ name: tags.name }).from(itemTags).innerJoin(tags, eq(itemTags.tagId, tags.id)).where(eq(itemTags.itemId, id)),
      db.select({ genero: itemGeneros.genero }).from(itemGeneros).where(eq(itemGeneros.itemId, id)),
    ]);
    return c.json(
      {
        ...created,
        tags: tagRows.map((r) => r.name),
        generos: genRows.map((r) => r.genero),
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "Error al crear el item", detail: message }, 500);
  }
});

itemsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(items).where(eq(items.id, id));
  if (!existing) return c.json({ error: "No encontrado" }, 404);

  const now = new Date();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (parsed.data.titulo !== undefined) patch.titulo = parsed.data.titulo;
  if (parsed.data.descripcion !== undefined) patch.descripcion = parsed.data.descripcion;
  if (parsed.data.thumbnailUrl !== undefined) patch.thumbnailUrl = parsed.data.thumbnailUrl;
  if (parsed.data.posterUrl !== undefined) patch.posterUrl = parsed.data.posterUrl;
  if (parsed.data.url !== undefined) patch.url = parsed.data.url;
  if (parsed.data.visto !== undefined) patch.visto = parsed.data.visto;
  if (parsed.data.tipo !== undefined) patch.tipo = parsed.data.tipo;

  await db.update(items).set(patch as any).where(eq(items.id, id));

  if (parsed.data.tags !== undefined) {
    await db.delete(itemTags).where(eq(itemTags.itemId, id));
    for (const name of parsed.data.tags) {
      let [tag] = await db.select().from(tags).where(eq(tags.name, name));
      if (!tag) {
        const tid = nanoid();
        await db.insert(tags).values({ id: tid, name, usageCount: 1 });
        await db.insert(itemTags).values({ itemId: id, tagId: tid });
      } else {
        await db.insert(itemTags).values({ itemId: id, tagId: tag.id });
      }
    }
  }
  if (parsed.data.generos !== undefined) {
    await db.delete(itemGeneros).where(eq(itemGeneros.itemId, id));
    for (const g of parsed.data.generos) {
      await db.insert(itemGeneros).values({ itemId: id, genero: g });
    }
  }

  const [updated] = await db.select().from(items).where(eq(items.id, id));
  return c.json(updated);
});

itemsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const r = await db.delete(items).where(eq(items.id, id));
  if (r.meta.changes === 0) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});
