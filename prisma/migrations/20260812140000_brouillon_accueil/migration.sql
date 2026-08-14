-- Brouillon de la page d'accueil.
--
-- L'éditeur enregistre en continu dans ces colonnes, l'aperçu les lit. Les
-- visiteurs continuent de voir `homeBlocks` et `themePreset` : on ne publie
-- rien tant que le marchand n'a pas cliqué sur « Publier ».
--
-- NULL signifie « pas de brouillon en cours » : l'aperçu retombe alors sur la
-- composition publiée.

ALTER TABLE "Settings"
  ADD COLUMN "homeBlocksDraft" JSONB,
  ADD COLUMN "themePresetDraft" TEXT;
