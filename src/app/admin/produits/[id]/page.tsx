import { notFound } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import ProductForm from "../ProductForm";
import { updateProductAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: { position: "asc" },
      select: { id: true, label: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageTitle title={product.name} description={`Référence : ${product.sku}`} />
      <ProductForm
        action={updateProductAction}
        categories={categories}
        values={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          image: product.image,
          unit: product.unit,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          minStock: product.minStock,
          popular: product.popular,
          active: product.active,
          promoDiscount: product.promoDiscount,
          oldPrice: product.oldPrice,
          categoryId: product.categoryId,
        }}
      />
    </>
  );
}
