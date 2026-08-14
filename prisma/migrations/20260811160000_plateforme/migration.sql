-- ============================================================================
-- Console plateforme : comptes de l'éditeur et journal d'audit
-- ============================================================================

CREATE TABLE "PlatformUser" (
  "id"           TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");
CREATE INDEX "PlatformUser_email_idx" ON "PlatformUser"("email");

CREATE TYPE "AuditAction" AS ENUM (
  'TENANT_CREE',
  'TENANT_SUSPENDU',
  'TENANT_REACTIVE',
  'TENANT_RESILIE',
  'IMPERSONATION'
);

CREATE TABLE "AuditLog" (
  "id"             TEXT NOT NULL,
  "action"         "AuditAction" NOT NULL,
  "details"        TEXT NOT NULL DEFAULT '',
  "tenantId"       TEXT,
  "tenantName"     TEXT NOT NULL DEFAULT '',
  "platformUserId" TEXT,
  "actorName"      TEXT NOT NULL DEFAULT '',
  "ip"             TEXT NOT NULL DEFAULT '',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- Le journal survit à la suppression d'un compte : on ne perd pas la trace.
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_platformUserId_fkey"
  FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL;

-- Réglages ajoutés en phase 2 (identité de la boutique côté vitrine)
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "slogan" TEXT NOT NULL DEFAULT '';
