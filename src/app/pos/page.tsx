import { db } from "@/lib/tenant-db";
import { requireSession } from "@/lib/auth";
import PosTerminal, { type PosProduct } from "./PosTerminal";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const prisma = await db();
  await requireSession();

  const [rows, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ popular: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        unit: true,
        category: { select: { key: true, label: true } },
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, creditBalance: true },
    }),
  ]);

  const products: PosProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    categoryKey: p.category.key,
    categoryLabel: p.category.label,
  }));

  return <PosTerminal products={products} customers={customers} />;
}
