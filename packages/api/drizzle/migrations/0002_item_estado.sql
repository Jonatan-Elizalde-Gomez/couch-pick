ALTER TABLE `items` ADD COLUMN `estado` TEXT NOT NULL DEFAULT 'unwatched';

UPDATE `items`
SET `estado` = CASE
  WHEN `visto` = 1 THEN 'watched'
  ELSE 'unwatched'
END
WHERE `estado` IS NULL OR `estado` = '';
