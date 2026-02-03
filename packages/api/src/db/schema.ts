import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  tipo: text("tipo", { enum: ["movie", "series", "anime", "youtube"] }).notNull(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  thumbnailUrl: text("thumbnail_url"),
  posterUrl: text("poster_url"),
  url: text("url"),
  visto: integer("visto", { mode: "boolean" }).notNull().default(false),
  externalId: text("external_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  usageCount: integer("usage_count").notNull().default(0),
});

export const itemTags = sqliteTable("item_tags", {
  itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

export const itemGeneros = sqliteTable("item_generos", {
  itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  genero: text("genero").notNull(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
