-- ============================================================================
-- Personnalisation de la vitrine par le marchand
-- ============================================================================

ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "logoUrl"         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "heroImageUrl"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "primaryColor"    TEXT NOT NULL DEFAULT '#0B2E63',
  ADD COLUMN IF NOT EXISTS "accentColor"     TEXT NOT NULL DEFAULT '#D4A017',
  ADD COLUMN IF NOT EXISTS "heroEyebrow"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "heroTitle"       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "heroSubtitle"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "highlights"      JSONB,
  ADD COLUMN IF NOT EXISTS "aboutText"       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "openingHours"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "socialFacebook"  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "socialInstagram" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "socialTiktok"    TEXT NOT NULL DEFAULT '';

-- La boutique historique garde son identité actuelle.
UPDATE "Settings" SET
  "openingHours" = COALESCE(NULLIF("openingHours", ''), 'Lun – Sam : 08h00 – 20h00')
WHERE "openingHours" = '';
