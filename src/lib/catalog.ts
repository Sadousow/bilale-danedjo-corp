import "server-only";

import { db } from "@/lib/tenant-db";
import { type Category, type Product } from "@/lib/products";

/**
 * Lecture du catalogue de la boutique courante, mise en forme pour le site
 * public. Le filtrage par tenant est appliqué par la garde Prisma.
 */

type DbProduct = {
  sku: string;
  name: string;
  description: string;
  image: string;
  unit: string | null;
  price: number;
  stock: number;
  popular: boolean;
  promoDiscount: number | null;
  oldPrice: number | null;
  category: { key: string };
};

function toPublicProduct(p: DbProduct): Product {
  return {
    id: p.sku,
    name: p.name,
    category: p.category.key as Category,
    price: p.price,
    unit: p.unit ?? undefined,
    image: p.image,
    description: p.description,
    popular: p.popular,
    promo:
      p.promoDiscount && p.oldPrice
        ? { discount: p.promoDiscount, oldPrice: p.oldPrice }
        : undefined,
    inStock: p.stock > 0,
  };
}

const select = {
  sku: true,
  name: true,
  description: true,
  image: true,
  unit: true,
  price: true,
  stock: true,
  popular: true,
  promoDiscount: true,
  oldPrice: true,
  category: { select: { key: true } },
} as const;

export async function getCatalogProducts(): Promise<Product[]> {
  try {
    const prisma = await db();
    const rows = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ popular: "desc" }, { name: "asc" }],
      select,
    });
    return rows.map(toPublicProduct);
  } catch {
    return [];
  }
}

export async function getCatalogCategories() {
  try {
    const prisma = await db();
    const rows = await prisma.category.findMany({
      orderBy: { position: "asc" },
    });
    return rows.map((c) => ({
      key: c.key as Category,
      label: c.label,
      description: c.description,
    }));
  } catch {
    return [];
  }
}

export async function getPopularProducts(limit = 6): Promise<Product[]> {
  const all = await getCatalogProducts();
  return all.filter((p) => p.popular).slice(0, limit);
}

export async function getPromoProducts(): Promise<Product[]> {
  const all = await getCatalogProducts();
  return all.filter((p) => p.promo);
}

/** Derniers produits ajoutés au catalogue — utilisé par les blocs d'accueil. */
export async function getRecentProducts(limit = 8): Promise<Product[]> {
  try {
    const prisma = await db();
    const rows = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select,
    });
    return rows.map(toPublicProduct);
  } catch {
    return [];
  }
}
