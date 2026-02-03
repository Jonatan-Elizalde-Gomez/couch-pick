import { Hono } from "hono";
import { eq, and, inArray, not } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { Env } from "../bindings";
import { getDb } from "../db";
import { items, itemTags, itemGeneros, tags } from "../db/schema";

function getQueryArray(url: URL, key: string): string[] {
  const raw = url.searchParams.getAll(key);
  return raw.flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
}

/**
 * POST /shuffle: devuelve un item aleatorio del conjunto filtrado.
 * Filtros igual que GET /items (query params). Soporta múltiples tipo, tag, genero.
 */
export const shuffleRouter = new Hono<{ Bindings: Env }>();

shuffleRouter.use("*", async (c, next) => {
  const err = await requireAuth(c);
  if (err) return err;
  return next();
});

shuffleRouter.post("/", async (c) => {
  const url = new URL(c.req.url);
  const tipos = getQueryArray(url, "tipo");
  const tipoExcluir = getQueryArray(url, "tipoExcluir");
  const soloNoVistos = c.req.query("soloNoVistos") === "true";
  const tagsFilter = getQueryArray(url, "tag");
  const tagsExcluir = getQueryArray(url, "tagExcluir");
  const generos = getQueryArray(url, "genero");
  const generosExcluir = getQueryArray(url, "generoExcluir");

  const db = getDb(c.env.DB);
  const conditions = [];
  if (tipos.length > 0) conditions.push(inArray(items.tipo, tipos as any));
  if (tipoExcluir.length > 0) conditions.push(not(inArray(items.tipo, tipoExcluir as any)));
  if (soloNoVistos) conditions.push(eq(items.visto, false));

  let list = conditions.length
    ? await db.select().from(items).where(and(...conditions))
    : await db.select().from(items);

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
    list = list.filter((i) => idsWithAnyGen.has(i.id));
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
    list = list.filter((i) => !idsWithExclGen.has(i.id));
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
    list = list.filter((i) => idsWithAnyTag.has(i.id));
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
    list = list.filter((i) => !idsWithExclTag.has(i.id));
  }

  if (list.length === 0) {
    return c.json({ error: "No hay items que coincidan con los filtros" }, 404);
  }

  /* Shuffle sobre resultados sin duplicados: cada ítem aparece una vez, misma probabilidad */
  const winner = list[Math.floor(Math.random() * list.length)];
  const [tagRows, genRows] = await Promise.all([
    db.select({ name: tags.name }).from(itemTags).innerJoin(tags, eq(itemTags.tagId, tags.id)).where(eq(itemTags.itemId, winner.id)),
    db.select({ genero: itemGeneros.genero }).from(itemGeneros).where(eq(itemGeneros.itemId, winner.id)),
  ]);
  const item = {
    ...winner,
    tags: tagRows.map((r) => r.name),
    generos: genRows.map((r) => r.genero),
  };
  return c.json({ item });
});
