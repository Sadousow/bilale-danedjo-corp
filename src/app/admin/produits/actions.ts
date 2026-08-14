"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { productQuota } from "@/lib/subscription";

export type FormState = { error?: string };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function num(formData: FormData, key: string, fallback = 0): number {
  const raw = String(formData.get(key) ?? "").replace(/\s/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function parseProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const price = num(formData, "price");
  const cost = num(formData, "cost");
  const minStock = num(formData, "minStock", 5);
  const promoDiscount = num(formData, "promoDiscount");
  const oldPrice = num(formData, "oldPrice");

  return {
    name,
    categoryId,
    price,
    cost,
    minStock,
    description: String(formData.get("description") ?? "").trim(),
    image: String(formData.get("image") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim() || null,
    popular: formData.get("popular") === "on",
    active: formData.get("active") === "on",
    promoDiscount: promoDiscount > 0 ? promoDiscount : null,
    oldPrice: promoDiscount > 0 && oldPrice > 0 ? oldPrice : null,
  };
}

function validate(data: ReturnType<typeof parseProduct>): string | null {
  if (!data.name) return "Le nom du produit est obligatoire.";
  if (!data.categoryId) return "Choisissez une catégorie.";
  if (data.price <= 0) return "Le prix de vente doit être supérieur à 0.";
  if (data.cost < 0) return "Le prix d'achat ne peut pas être négatif.";
  if (data.promoDiscount && (data.promoDiscount < 1 || data.promoDiscount > 90))
    return "La remise doit être comprise entre 1 % et 90 %.";
  return null;
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const prisma = await db();
  await requireRole("GERANT");

  const data = parseProduct(formData);
  const error = validate(data);
  if (error) return { error };

  const quota = await productQuota();
  if (!quota.allowed) return { error: quota.message };

  const stock = num(formData, "stock");
  let sku = String(formData.get("sku") ?? "").trim() || slugify(data.name);

  if (await prisma.product.findUnique({ where: { sku } })) {
    sku = `${sku}-${Date.now().toString().slice(-4)}`;
  }

  const product = await prisma.product.create({
    data: { ...data, sku, stock: Math.max(0, stock) },
  });

  if (stock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: "ENTREE",
        quantity: stock,
        before: 0,
        after: stock,
        reason: "Stock initial",
      },
    });
  }

  revalidatePath("/admin/produits");
  revalidatePath("/produits");
  redirect("/admin/produits?ok=cree");
}

export async function updateProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const prisma = await db();
  await requireRole("GERANT");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Produit introuvable." };

  const data = parseProduct(formData);
  const error = validate(data);
  if (error) return { error };

  await prisma.product.update({ where: { id }, data });

  revalidatePath("/admin/produits");
  revalidatePath("/produits");
  redirect("/admin/produits?ok=modifie");
}

export async function toggleProductAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;

  /*
   * Réactiver un produit consomme une place au catalogue. Sans ce contrôle,
   * désactiver puis réactiver permettrait de dépasser la limite de l'offre
   * autant de fois qu'on veut.
   */
  if (!product.active) {
    const quota = await productQuota();
    if (!quota.allowed) return;
  }

  await prisma.product.update({
    where: { id },
    data: { active: !product.active },
  });

  revalidatePath("/admin/produits");
  revalidatePath("/produits");
}

export async function deleteProductAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const sold = await prisma.saleItem.count({ where: { productId: id } });
  if (sold > 0) {
    // Historique de ventes : on désactive au lieu de supprimer
    await prisma.product.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.product.delete({ where: { id } });
  }

  revalidatePath("/admin/produits");
  revalidatePath("/produits");
}
