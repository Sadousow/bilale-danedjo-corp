-- Publication partielle du catalogue vers Meta.
--
-- Le catalogue Guygou n'est pas le catalogue Meta. Un marchand ne pousse
-- qu'une sélection : ses articles d'appel, pas ses 400 références. La
-- publication est donc opt-in, article par article — même choix que
-- `Settings.shopPublished`, faux par défaut, pour qu'aucune donnée ne parte
-- chez un tiers sans un geste explicite du marchand.
--
-- Aucune ligne n'est créée ici : `MetaCatalogItem` se remplit au premier clic.
-- L'absence de ligne signifie « jamais publié ». C'est ce qui évite d'insérer
-- une ligne morte par produit existant.
--
-- Les deux colonnes de dimensions sur `Product` existent pour une seule
-- raison : Meta exige des images d'au moins 500 × 500 px et rejette en dessous
-- sans rien expliquer au marchand. Les relever au téléversement permet
-- d'afficher « photo trop petite » dans la liste des produits, avant toute
-- tentative de publication. Elles restent nulles sur les produits déjà en
-- base — nul veut dire « non mesurée », pas « trop petite ».

-- ------------------------------------------------------------------ Product

ALTER TABLE "Product" ADD COLUMN "imageWidth" INTEGER;
ALTER TABLE "Product" ADD COLUMN "imageHeight" INTEGER;

-- ---------------------------------------------------------- MetaCatalogItem

CREATE TYPE "ItemSyncStatus" AS ENUM ('EN_ATTENTE', 'PUBLIE', 'REJETE', 'RETIRE');

CREATE TABLE "MetaCatalogItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" "ItemSyncStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "lastSyncedAt" TIMESTAMP(3),
    "rejectionMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "MetaCatalogItem_pkey" PRIMARY KEY ("id")
);

-- Contrainte unique globale, volontaire : `productId` pointe une clé primaire
-- cuid, déjà unique dans toute la base. Une collision entre deux marchands est
-- impossible par construction, et la relation un-à-un l'exige. La règle « les
-- contraintes uniques sont composites » vise les identifiants métier — `sku`,
-- numéro de facture — que deux marchands doivent pouvoir réutiliser.
CREATE UNIQUE INDEX "MetaCatalogItem_productId_key" ON "MetaCatalogItem"("productId");

CREATE INDEX "MetaCatalogItem_tenantId_published_idx" ON "MetaCatalogItem"("tenantId", "published");
CREATE INDEX "MetaCatalogItem_tenantId_syncStatus_idx" ON "MetaCatalogItem"("tenantId", "syncStatus");

ALTER TABLE "MetaCatalogItem"
    ADD CONSTRAINT "MetaCatalogItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetaCatalogItem"
    ADD CONSTRAINT "MetaCatalogItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
