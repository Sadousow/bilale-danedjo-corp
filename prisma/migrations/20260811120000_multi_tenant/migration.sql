-- ============================================================================
-- Passage en multi-tenant
--
-- Migration écrite à la main : `prisma db push` recréerait les tables et
-- détruirait les données. Les données existantes sont rattachées à un premier
-- tenant — Bilale et Danedjo Corporation.
--
-- ⚠️ Sauvegarder la base avant exécution (sur Neon : créer une branche).
-- ============================================================================

-- ---------------------------------------------------------------- 1. Plateforme

CREATE TYPE "TenantStatus" AS ENUM ('ESSAI', 'ACTIF', 'SUSPENDU', 'RESILIE');

CREATE TABLE "Tenant" (
  "id"                TEXT NOT NULL,
  "slug"              TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "status"            "TenantStatus" NOT NULL DEFAULT 'ESSAI',
  "djomyClientId"     TEXT,
  "djomyClientSecret" TEXT,
  "djomyEnabled"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

CREATE TABLE "TenantDomain" (
  "id"                TEXT NOT NULL,
  "host"              TEXT NOT NULL,
  "verified"          BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT NOT NULL,
  "isPrimary"         BOOLEAN NOT NULL DEFAULT false,
  "tenantId"          TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantDomain_host_key" ON "TenantDomain"("host");
CREATE INDEX "TenantDomain_tenantId_idx" ON "TenantDomain"("tenantId");

ALTER TABLE "TenantDomain"
  ADD CONSTRAINT "TenantDomain_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------- 2. Premier tenant

INSERT INTO "Tenant" ("id", "slug", "name", "status", "createdAt", "updatedAt")
VALUES (
  'tnt_bilale_danedjo',
  'bilale',
  'Bilale et Danedjo Corporation SARLU',
  'ACTIF',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------- 3. tenantId

-- Ajout en nullable, remplissage, puis passage en NOT NULL : aucune ligne
-- existante n'est perdue.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'User', 'Category', 'Product', 'Customer', 'Sale', 'SaleItem',
    'StockMovement', 'Payment', 'Document', 'DocumentItem',
    'DocumentPayment', 'DeliveryZone', 'Order', 'OrderItem'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN "tenantId" TEXT', t);
    EXECUTE format('UPDATE %I SET "tenantId" = %L', t, 'tnt_bilale_danedjo');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "tenantId" SET NOT NULL', t);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE',
      t, t || '_tenantId_fkey'
    );
    EXECUTE format('CREATE INDEX %I ON %I("tenantId")', t || '_tenantId_idx', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- 4. Counter

-- La clé primaire devient composite : chaque tenant a ses propres compteurs.
ALTER TABLE "Counter" ADD COLUMN "tenantId" TEXT;
UPDATE "Counter" SET "tenantId" = 'tnt_bilale_danedjo';
ALTER TABLE "Counter" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Counter" DROP CONSTRAINT "Counter_pkey";
ALTER TABLE "Counter" ADD CONSTRAINT "Counter_pkey" PRIMARY KEY ("tenantId", "key");
ALTER TABLE "Counter"
  ADD CONSTRAINT "Counter_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------- 5. Settings

-- Une ligne de réglages par tenant, identifiée par le tenant lui-même.
ALTER TABLE "Settings" ADD COLUMN "tenantId" TEXT;
UPDATE "Settings" SET "tenantId" = 'tnt_bilale_danedjo';
ALTER TABLE "Settings" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey";
ALTER TABLE "Settings" DROP COLUMN "id";
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("tenantId");
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------- 6. Numéro de ticket

-- Le numéro de vente reposait sur une séquence PostgreSQL globale : en
-- multi-tenant, les tickets de deux marchands se mélangeraient. On bascule
-- sur le compteur applicatif, en reprenant la numérotation là où elle en est.
ALTER TABLE "Sale" ALTER COLUMN "number" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "number" SET DEFAULT 0;
DROP SEQUENCE IF EXISTS "Sale_number_seq" CASCADE;

INSERT INTO "Counter" ("tenantId", "key", "value")
SELECT
  'tnt_bilale_danedjo',
  'SALE-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
  COALESCE(MAX("number"), 0)
FROM "Sale"
ON CONFLICT ("tenantId", "key") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

-- Idem pour les documents et les commandes, dont les compteurs existaient
-- déjà mais sans tenant.
INSERT INTO "Counter" ("tenantId", "key", "value")
SELECT
  'tnt_bilale_danedjo',
  "type"::TEXT || '-' || "year"::TEXT,
  MAX("number")
FROM "Document"
GROUP BY "type", "year"
ON CONFLICT ("tenantId", "key") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("tenantId", "key", "value")
SELECT 'tnt_bilale_danedjo', 'ORDER-' || "year"::TEXT, MAX("number")
FROM "Order"
GROUP BY "year"
ON CONFLICT ("tenantId", "key") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

-- ---------------------------------------------------------------- 7. Contraintes

-- Les contraintes uniques étaient globales : deux marchands doivent pouvoir
-- avoir un produit « riz-parfume-25kg » ou un client au même numéro.
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_email_idx";
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

DROP INDEX IF EXISTS "Category_key_key";
CREATE UNIQUE INDEX "Category_tenantId_key_key" ON "Category"("tenantId", "key");

DROP INDEX IF EXISTS "Product_sku_key";
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

DROP INDEX IF EXISTS "Customer_phone_key";
DROP INDEX IF EXISTS "Customer_email_key";
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");
CREATE UNIQUE INDEX "Customer_tenantId_email_key" ON "Customer"("tenantId", "email");

DROP INDEX IF EXISTS "Sale_number_key";
CREATE UNIQUE INDEX "Sale_tenantId_number_key" ON "Sale"("tenantId", "number");

DROP INDEX IF EXISTS "Document_reference_key";
DROP INDEX IF EXISTS "Document_type_year_number_key";
CREATE UNIQUE INDEX "Document_tenantId_reference_key" ON "Document"("tenantId", "reference");
CREATE UNIQUE INDEX "Document_tenantId_type_year_number_key" ON "Document"("tenantId", "type", "year", "number");

DROP INDEX IF EXISTS "Order_reference_key";
DROP INDEX IF EXISTS "Order_year_number_key";
CREATE UNIQUE INDEX "Order_tenantId_reference_key" ON "Order"("tenantId", "reference");
CREATE UNIQUE INDEX "Order_tenantId_year_number_key" ON "Order"("tenantId", "year", "number");
