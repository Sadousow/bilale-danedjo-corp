/**
 * Seed initial d'une boutique.
 *
 *   npm run db:seed                    → boutique « bilale » par défaut
 *   TENANT_SLUG=demo npm run db:seed   → une autre boutique
 *
 * Le script est idempotent : relancé, il met à jour sans dupliquer.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { categories, products } from "../src/lib/products";

const prisma = new PrismaClient();

const SLUG = process.env.TENANT_SLUG ?? "bilale";
const NAME =
  process.env.TENANT_NAME ?? "Bilale et Danedjo Corporation SARLU";

async function main() {
  console.log(`→ Boutique « ${SLUG} »…`);
  const tenant = await prisma.tenant.upsert({
    where: { slug: SLUG },
    update: { name: NAME },
    create: { slug: SLUG, name: NAME, status: "ACTIF" },
  });
  const tenantId = tenant.id;

  console.log("→ Réglages…");
  await prisma.settings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, companyName: NAME },
  });

  console.log("→ Catégories…");
  for (const [index, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { tenantId_key: { tenantId, key: c.key } },
      update: { label: c.label, description: c.description, position: index },
      create: {
        tenantId,
        key: c.key,
        label: c.label,
        description: c.description,
        position: index,
      },
    });
  }

  const catByKey = new Map(
    (await prisma.category.findMany({ where: { tenantId } })).map((c) => [
      c.key,
      c.id,
    ])
  );

  console.log("→ Produits…");
  for (const p of products) {
    const categoryId = catByKey.get(p.category);
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId, sku: p.id } },
      update: {
        name: p.name,
        description: p.description,
        image: p.image,
        unit: p.unit ?? null,
        price: p.price,
        popular: p.popular ?? false,
        promoDiscount: p.promo?.discount ?? null,
        oldPrice: p.promo?.oldPrice ?? null,
        categoryId,
      },
      create: {
        tenantId,
        sku: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        unit: p.unit ?? null,
        price: p.price,
        // marge par défaut estimée à 18 % — à corriger dans le back-office
        cost: Math.round(p.price * 0.82),
        stock: p.inStock ? 25 : 0,
        minStock: 5,
        popular: p.popular ?? false,
        active: true,
        promoDiscount: p.promo?.discount ?? null,
        oldPrice: p.promo?.oldPrice ?? null,
        categoryId,
      },
    });
  }

  console.log("→ Zones de livraison…");
  const zones = [
    { name: "Conakry — centre", fee: 25000, freeAbove: 1000000, delay: "24 h", position: 0 },
    { name: "Conakry — banlieue", fee: 50000, freeAbove: 1500000, delay: "24 à 48 h", position: 1 },
    { name: "Intérieur du pays", fee: 150000, freeAbove: 0, delay: "3 à 5 jours", position: 2 },
  ];

  for (const zone of zones) {
    const existing = await prisma.deliveryZone.findFirst({
      where: { tenantId, name: zone.name },
    });
    if (!existing) await prisma.deliveryZone.create({ data: { tenantId, ...zone } });
  }

  console.log("→ Utilisateurs…");
  const seedUsers = [
    {
      email: "admin@bdcorporation.com",
      name: "Administrateur",
      role: "ADMIN" as const,
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@2026",
    },
    {
      email: "gerant@bdcorporation.com",
      name: "Gérant boutique",
      role: "GERANT" as const,
      password: process.env.SEED_GERANT_PASSWORD ?? "Gerant@2026",
    },
    {
      email: "caissier@bdcorporation.com",
      name: "Caissier",
      role: "CAISSIER" as const,
      password: process.env.SEED_CAISSIER_PASSWORD ?? "Caisse@2026",
    },
  ];

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: u.email } },
      update: { name: u.name, role: u.role },
      create: {
        tenantId,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
      },
    });
    console.log(`   ${u.email} — mot de passe : ${u.password}`);
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  console.log("\n✅ Seed terminé.");
  console.log(`   Boutique accessible sur http://${SLUG}.${root}`);
  console.log("⚠️  Changez les mots de passe par défaut dès la première connexion.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
