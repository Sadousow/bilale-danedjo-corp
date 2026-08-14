import type { Metadata } from "next";

import PageHeader from "@/components/PageHeader";
import { getSettings } from "@/lib/settings";
import { requireFeature } from "@/lib/subscription";
import CartView from "./CartView";

export const metadata: Metadata = {
  title: "Panier",
  description: "Votre panier.",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const settings = await getSettings();

  // Les boutons d'ajout disparaissent quand la vente en ligne n'est pas
  // ouverte, mais l'adresse reste devinable : on ferme aussi la page.
  await requireFeature("shop");

  return (
    <>
      <PageHeader
        eyebrow="Votre commande"
        title="Panier"
        description="Vérifiez vos articles avant de passer à la livraison."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CartView minOrderAmount={settings.minOrderAmount} />
        </div>
      </section>
    </>
  );
}
