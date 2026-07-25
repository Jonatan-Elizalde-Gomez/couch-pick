import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  tipo: text("tipo", { enum: ["movie", "series", "anime", "youtube"] }).notNull(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  thumbnailUrl: text("thumbnail_url"),
  posterUrl: text("poster_url"),
  url: text("url"),
  estado: text("estado", { enum: ["unwatched", "watching", "watched"] }).notNull().default("unwatched"),
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

export const userFilterPreferences = sqliteTable("user_filter_preferences", {
  email: text("email").primaryKey(),
  autoApply: integer("auto_apply", { mode: "boolean" }).notNull().default(true),
  soloNoVistos: integer("solo_no_vistos", { mode: "boolean" }).notNull().default(true),
  tipo: text("tipo").notNull().default("[]"),
  tipoExcluir: text("tipo_excluir").notNull().default("[]"),
  genero: text("genero").notNull().default("[]"),
  generoExcluir: text("genero_excluir").notNull().default("[]"),
  tag: text("tag").notNull().default("[]"),
  tagExcluir: text("tag_excluir").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type UserFilterPreferences = typeof userFilterPreferences.$inferSelect;
