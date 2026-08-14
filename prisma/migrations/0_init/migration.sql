-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('BROUILLON', 'EMIS', 'ACCEPTE', 'REFUSE', 'CONVERTI', 'PAYE_PARTIEL', 'PAYE', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('PROFORMA', 'FACTURE', 'BON_LIVRAISON');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('ENTREE', 'SORTIE', 'VENTE', 'AJUSTEMENT', 'RETOUR');

-- CreateEnum
CREATE TYPE "public"."OrderPaymentMethod" AS ENUM ('A_LA_LIVRAISON', 'EN_LIGNE');

-- CreateEnum
CREATE TYPE "public"."OrderPaymentStatus" AS ENUM ('EN_ATTENTE', 'PAYEE', 'ECHOUEE', 'REMBOURSEE');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('RECUE', 'CONFIRMEE', 'PREPAREE', 'EXPEDIEE', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('ESPECES', 'ORANGE_MONEY', 'MTN_MOMO', 'VIREMENT', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'GERANT', 'CAISSIER');

-- CreateEnum
CREATE TYPE "public"."SaleStatus" AS ENUM ('COMPLETEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nif" TEXT,
    "rccm" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "freeAbove" INTEGER NOT NULL DEFAULT 0,
    "delay" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'BROUILLON',
    "number" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "clientNif" TEXT,
    "clientRccm" TEXT,
    "customerId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" INTEGER NOT NULL DEFAULT 18,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "taxableBase" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "deliveryAddress" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "saleId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "productId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unit" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentPayment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL DEFAULT 'ESPECES',
    "note" TEXT NOT NULL DEFAULT '',
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'RECUE',
    "paymentMethod" "public"."OrderPaymentMethod" NOT NULL DEFAULT 'A_LA_LIVRAISON',
    "paymentStatus" "public"."OrderPaymentStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientAddress" TEXT NOT NULL,
    "clientNotes" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT,
    "zoneId" TEXT,
    "zoneName" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentReference" TEXT,
    "paymentProvider" TEXT,
    "paidAt" TIMESTAMP(3),
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL DEFAULT 'ESPECES',
    "note" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "unit" TEXT,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "promoDiscount" INTEGER,
    "oldPrice" INTEGER,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sale" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "change" INTEGER NOT NULL DEFAULT 0,
    "due" INTEGER NOT NULL DEFAULT 0,
    "method" "public"."PaymentMethod" NOT NULL DEFAULT 'ESPECES',
    "status" "public"."SaleStatus" NOT NULL DEFAULT 'COMPLETEE',
    "note" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Bilale et Danedjo Corporation SARLU',
    "companyAddress" TEXT NOT NULL DEFAULT 'Conakry, République de Guinée',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "nif" TEXT NOT NULL DEFAULT '',
    "rccm" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankIban" TEXT NOT NULL DEFAULT '',
    "bankSwift" TEXT NOT NULL DEFAULT '',
    "defaultVatRate" INTEGER NOT NULL DEFAULT 18,
    "vatEnabledByDefault" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Règlement à 30 jours à compter de la date de facturation.',
    "proformaValidityDays" INTEGER NOT NULL DEFAULT 30,
    "documentFooter" TEXT NOT NULL DEFAULT '',
    "signatureLabel" TEXT NOT NULL DEFAULT 'Cachet et signature',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "orderConfirmation" TEXT NOT NULL DEFAULT 'Merci ! Nous vous appelons pour confirmer votre commande.',
    "shopEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'CAISSIER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "public"."Category"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "public"."Customer"("email" ASC);

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "public"."Customer"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "public"."Customer"("phone" ASC);

-- CreateIndex
CREATE INDEX "DeliveryZone_active_idx" ON "public"."DeliveryZone"("active" ASC);

-- CreateIndex
CREATE INDEX "Document_customerId_idx" ON "public"."Document"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Document_issueDate_idx" ON "public"."Document"("issueDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Document_reference_key" ON "public"."Document"("reference" ASC);

-- CreateIndex
CREATE INDEX "Document_type_status_idx" ON "public"."Document"("type" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Document_type_year_number_key" ON "public"."Document"("type" ASC, "year" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "DocumentItem_documentId_idx" ON "public"."DocumentItem"("documentId" ASC);

-- CreateIndex
CREATE INDEX "DocumentItem_productId_idx" ON "public"."DocumentItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "DocumentPayment_documentId_idx" ON "public"."DocumentPayment"("documentId" ASC);

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "public"."Order"("reference" ASC);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_year_number_key" ON "public"."Order"("year" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "public"."Payment"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "public"."Payment"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "public"."Product"("active" ASC);

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku" ASC);

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "public"."Sale"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "public"."Sale"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_number_key" ON "public"."Sale"("number" ASC);

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "public"."Sale"("userId" ASC);

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "public"."SaleItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "public"."SaleItem"("saleId" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "public"."StockMovement"("productId" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentItem" ADD CONSTRAINT "DocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentItem" ADD CONSTRAINT "DocumentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentPayment" ADD CONSTRAINT "DocumentPayment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentPayment" ADD CONSTRAINT "DocumentPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

