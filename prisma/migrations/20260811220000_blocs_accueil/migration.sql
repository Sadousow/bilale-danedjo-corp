-- Composition de la page d'accueil et style visuel.
--
-- `homeBlocks` reste NULL pour les boutiques existantes : parseBlocks()
-- retombe alors sur la composition par défaut, qui reproduit exactement la
-- page actuelle. Aucune vitrine ne change d'aspect à la migration.

ALTER TABLE "Settings"
  ADD COLUMN "themePreset" TEXT NOT NULL DEFAULT 'classique',
  ADD COLUMN "homeBlocks" JSONB;
