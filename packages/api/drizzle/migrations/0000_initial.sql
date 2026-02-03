-- Items
CREATE TABLE IF NOT EXISTS `items` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `tipo` TEXT NOT NULL CHECK (tipo IN ('movie','series','anime','youtube')),
  `titulo` TEXT NOT NULL,
  `descripcion` TEXT,
  `thumbnail_url` TEXT,
  `poster_url` TEXT,
  `url` TEXT,
  `visto` INTEGER NOT NULL DEFAULT 0,
  `external_id` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);

-- Tags
CREATE TABLE IF NOT EXISTS `tags` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `name` TEXT NOT NULL UNIQUE,
  `usage_count` INTEGER NOT NULL DEFAULT 0
);

-- Item <-> Tags (N:M)
CREATE TABLE IF NOT EXISTS `item_tags` (
  `item_id` TEXT NOT NULL REFERENCES `items`(`id`) ON DELETE CASCADE,
  `tag_id` TEXT NOT NULL REFERENCES `tags`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`item_id`, `tag_id`)
);

-- Géneros por item (lista de strings)
CREATE TABLE IF NOT EXISTS `item_generos` (
  `item_id` TEXT NOT NULL REFERENCES `items`(`id`) ON DELETE CASCADE,
  `genero` TEXT NOT NULL,
  PRIMARY KEY (`item_id`, `genero`)
);

CREATE INDEX IF NOT EXISTS idx_items_tipo ON items(tipo);
CREATE INDEX IF NOT EXISTS idx_items_visto ON items(visto);
CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_generos_item ON item_generos(item_id);
