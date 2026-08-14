-- Limitation des tentatives d'authentification.
--
-- Table de plateforme : la connexion précède la résolution du tenant, et une
-- adresse IP doit être comptée toutes boutiques confondues.
-- La clé est un HMAC, jamais un email ou une IP en clair.

CREATE TABLE "AuthAttempt" (
  "key"         TEXT NOT NULL,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "lockCount"   INTEGER NOT NULL DEFAULT 0,
  "firstAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),

  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key")
);

-- Le nettoyage périodique balaie par date de dernière tentative.
CREATE INDEX "AuthAttempt_lastAt_idx" ON "AuthAttempt"("lastAt");
