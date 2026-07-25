CREATE TABLE IF NOT EXISTS `user_filter_preferences` (
  `email` TEXT PRIMARY KEY NOT NULL,
  `auto_apply` INTEGER NOT NULL DEFAULT 1,
  `solo_no_vistos` INTEGER NOT NULL DEFAULT 1,
  `tipo` TEXT NOT NULL DEFAULT '[]',
  `tipo_excluir` TEXT NOT NULL DEFAULT '[]',
  `genero` TEXT NOT NULL DEFAULT '[]',
  `genero_excluir` TEXT NOT NULL DEFAULT '[]',
  `tag` TEXT NOT NULL DEFAULT '[]',
  `tag_excluir` TEXT NOT NULL DEFAULT '[]',
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
