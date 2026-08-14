import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import ProductForm from "../ProductForm";
import { createProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const prisma = await db();
  await requireRole("GERANT");
  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    select: { id: true, label: true },
  });

  return (
    <>
      <PageTitle
        title="Nouveau produit"
        description="Ajouter un article au catalogue et à la caisse"
      />
      <ProductForm action={createProductAction} categories={categories} />
    </>
  );
}
