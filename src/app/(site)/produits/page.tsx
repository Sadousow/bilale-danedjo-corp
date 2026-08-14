import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProductsCatalog from "./ProductsCatalog";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Produits",
  description:
    "Catalogue complet — alimentation générale, produits d'entretien et électroménager. Commande rapide par WhatsApp.",
};

type Props = {
  searchParams: Promise<{ cat?: string; q?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const [params, products, categories] = await Promise.all([
    searchParams,
    getCatalogProducts(),
    getCatalogCategories(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Tous nos produits"
        description="Parcourez notre sélection. Cliquez sur un produit pour commander directement par WhatsApp."
      />
      <ProductsCatalog
        products={products}
        categories={categories}
        initialCategory={params.cat}
        initialQuery={params.q}
      />
    </>
  );
}
