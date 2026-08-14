/**
 * Test d'isolation multi-tenant.
 *
 *   node scripts/test-isolation.mjs
 *
 * Crée deux boutiques factices, y écrit des données, et vérifie qu'aucune
 * ne peut lire ni modifier celles de l'autre. Les données de test sont
 * supprimées à la fin, y compris en cas d'échec.
 *
 * ⚠️ À lancer sur une base de développement, jamais en production.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SCOPED = new Set([
  "User", "Category", "Product", "Customer", "Sale", "SaleItem",
  "StockMovement", "Payment", "Counter", "Document", "DocumentItem",
  "DocumentPayment", "DeliveryZone", "Order", "OrderItem", "Settings",
]);

/** Réplique de la garde de src/lib/tenant-db.ts. */
function tenantDb(tenantId) {
  return prisma.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED.has(model)) return query(args);
          const a = args ?? {};

          if (operation === "create" || operation === "createMany") {
            a.data = Array.isArray(a.data)
              ? a.data.map((d) => ({ ...d, tenantId }))
              : { ...(a.data ?? {}), tenantId };
          } else if (operation === "upsert") {
            a.create = { ...(a.create ?? {}), tenantId };
            a.where = { ...(a.where ?? {}), tenantId };
          } else {
            a.where = { ...(a.where ?? {}), tenantId };
          }
          return query(a);
        },
      },
    },
  });
}

let failures = 0;

function check(label, condition) {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? "  ✅" : "  ❌"} ${label}`);
}

async function main() {
  const suffix = Date.now().toString(36);
  const slugA = `test-a-${suffix}`;
  const slugB = `test-b-${suffix}`;

  const a = await prisma.tenant.create({
    data: { slug: slugA, name: "Boutique A" },
  });
  const b = await prisma.tenant.create({
    data: { slug: slugB, name: "Boutique B" },
  });

  const dbA = tenantDb(a.id);
  const dbB = tenantDb(b.id);

  try {
    console.log("\nCatalogue");

    const catA = await dbA.category.create({
      data: { key: "test", label: "Test A" },
    });
    const catB = await dbB.category.create({
      data: { key: "test", label: "Test B" },
    });
    check(
      "deux boutiques peuvent avoir une catégorie de même clé",
      catA.id !== catB.id
    );

    const prodA = await dbA.product.create({
      data: { sku: "riz-25kg", name: "Riz A", price: 100, categoryId: catA.id },
    });
    await dbB.product.create({
      data: { sku: "riz-25kg", name: "Riz B", price: 200, categoryId: catB.id },
    });
    check("même SKU accepté dans deux boutiques", true);

    console.log("\nLecture croisée");

    const listA = await dbA.product.findMany();
    check("A ne voit que son produit", listA.length === 1);
    check("A voit le bon produit", listA[0]?.name === "Riz A");

    const stolen = await dbB.product.findUnique({ where: { id: prodA.id } });
    check("B ne peut pas lire le produit de A par son id", stolen === null);

    const stolenFirst = await dbB.product.findFirst({
      where: { id: prodA.id },
    });
    check("findFirst croisé bloqué aussi", stolenFirst === null);

    const countB = await dbB.product.count();
    check("le comptage de B ignore les produits de A", countB === 1);

    console.log("\nÉcriture croisée");

    let updateBlocked = false;
    try {
      await dbB.product.update({
        where: { id: prodA.id },
        data: { price: 1 },
      });
    } catch {
      updateBlocked = true;
    }
    check("B ne peut pas modifier le produit de A", updateBlocked);

    const untouched = await dbA.product.findFirst({ where: { id: prodA.id } });
    check("le prix du produit de A est intact", untouched?.price === 100);

    let deleteBlocked = false;
    try {
      await dbB.product.delete({ where: { id: prodA.id } });
    } catch {
      deleteBlocked = true;
    }
    check("B ne peut pas supprimer le produit de A", deleteBlocked);

    await dbB.product.deleteMany({});
    const survivorsA = await dbA.product.count();
    check("un deleteMany de B n'efface pas les produits de A", survivorsA === 1);

    console.log("\nCompteurs");

    await dbA.counter.upsert({
      where: { tenantId_key: { tenantId: a.id, key: "SALE-2026" } },
      create: { key: "SALE-2026", value: 7 },
      update: { value: { increment: 1 } },
    });
    const counterB = await dbB.counter.findFirst({
      where: { key: "SALE-2026" },
    });
    check("le compteur de A est invisible pour B", counterB === null);
  } finally {
    await prisma.tenant.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    console.log("\nBoutiques de test supprimées.");
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} vérification(s) en échec — fuite possible.`);
    process.exit(1);
  }
  console.log("\n✅ Isolation vérifiée.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
