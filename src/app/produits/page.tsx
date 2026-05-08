import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProductsCatalog from "./ProductsCatalog";

export const metadata: Metadata = {
  title: "Produits",
  description:
    "Catalogue complet — alimentation générale, produits d'entretien et électroménager. Commande rapide par WhatsApp.",
};

type Props = {
  searchParams: Promise<{ cat?: string; q?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Tous nos produits"
        description="Parcourez notre sélection. Cliquez sur un produit pour commander directement par WhatsApp."
      />
      <ProductsCatalog initialCategory={params.cat} initialQuery={params.q} />
    </>
  );
}
