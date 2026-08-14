-- ============================================================================
-- Abonnements : plans, souscriptions, factures de la plateforme
-- ============================================================================

CREATE TABLE "PlatformCounter" (
  "key"   TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlatformCounter_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "Plan" (
  "id"               TEXT NOT NULL,
  "code"             TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "priceMonthly"     INTEGER NOT NULL,
  "description"      TEXT NOT NULL DEFAULT '',
  "position"         INTEGER NOT NULL DEFAULT 0,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "maxProducts"      INTEGER NOT NULL DEFAULT 0,
  "maxUsers"         INTEGER NOT NULL DEFAULT 0,
  "featureShop"      BOOLEAN NOT NULL DEFAULT false,
  "featureInvoicing" BOOLEAN NOT NULL DEFAULT false,
  "featureDomain"    BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "Plan_active_idx" ON "Plan"("active");

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'ESSAI', 'ACTIF', 'IMPAYE', 'SUSPENDU', 'RESILIE'
);

CREATE TABLE "Subscription" (
  "id"               TEXT NOT NULL,
  "status"           "SubscriptionStatus" NOT NULL DEFAULT 'ESSAI',
  "tenantId"         TEXT NOT NULL,
  "planId"           TEXT NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "graceEndsAt"      TIMESTAMP(3),
  "cancelledAt"      TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id");

CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM (
  'EN_ATTENTE', 'PAYEE', 'ECHOUEE', 'ANNULEE'
);

CREATE TABLE "SubscriptionInvoice" (
  "id"               TEXT NOT NULL,
  "reference"        TEXT NOT NULL,
  "year"             INTEGER NOT NULL,
  "number"           INTEGER NOT NULL,
  "subscriptionId"   TEXT NOT NULL,
  "planName"         TEXT NOT NULL,
  "amount"           INTEGER NOT NULL,
  "periodStart"      TIMESTAMP(3) NOT NULL,
  "periodEnd"        TIMESTAMP(3) NOT NULL,
  "status"           "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'EN_ATTENTE',
  "paymentReference" TEXT,
  "paymentUrl"       TEXT,
  "paidAt"           TIMESTAMP(3),
  "paidManually"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionInvoice_reference_key" ON "SubscriptionInvoice"("reference");
CREATE UNIQUE INDEX "SubscriptionInvoice_year_number_key" ON "SubscriptionInvoice"("year", "number");
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");
CREATE INDEX "SubscriptionInvoice_subscriptionId_idx" ON "SubscriptionInvoice"("subscriptionId");

ALTER TABLE "SubscriptionInvoice"
  ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------- Plans initiaux

INSERT INTO "Plan"
  ("id", "code", "name", "priceMonthly", "description", "position",
   "maxProducts", "maxUsers", "featureShop", "featureInvoicing", "featureDomain")
VALUES
  ('plan_demarrage', 'demarrage', 'Démarrage', 150000,
   'Caisse et catalogue pour démarrer.', 0,
   100, 2, false, false, false),

  ('plan_boutique', 'boutique', 'Boutique', 350000,
   'Ajoute la boutique en ligne et la facturation.', 1,
   500, 5, true, true, false),

  ('plan_pro', 'pro', 'Pro', 750000,
   'Sans limite, avec votre propre nom de domaine.', 2,
   0, 0, true, true, true);

-- ---------------------------------------------------------------- Boutiques existantes

-- Les boutiques déjà créées passent au plan Pro, actif un an :
-- on ne coupe pas un service déjà rendu.
INSERT INTO "Subscription"
  ("id", "status", "tenantId", "planId", "currentPeriodEnd", "createdAt", "updatedAt")
SELECT
  'sub_' || "id",
  'ACTIF',
  "id",
  'plan_pro',
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant"
WHERE "id" NOT IN (SELECT "tenantId" FROM "Subscription");
