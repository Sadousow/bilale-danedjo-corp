-- Jetons de réinitialisation de mot de passe.
--
-- Table de plateforme : elle sert le personnel des boutiques, les clients et
-- les agents de la plateforme.
--
-- Seul le haché du jeton est stocké. Le jeton en clair n'existe que dans le
-- lien envoyé au destinataire.

CREATE TABLE "PasswordReset" (
  "id"        TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scope"     TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "tenantId"  TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- Invalider les jetons restants d'un compte après usage.
CREATE INDEX "PasswordReset_scope_subjectId_idx" ON "PasswordReset"("scope", "subjectId");

-- Purge des jetons expirés.
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
