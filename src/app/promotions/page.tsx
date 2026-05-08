import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getPromoProducts } from "@/lib/products";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promotions",
  description:
    "Profitez des promotions, offres spéciales et produits vedettes de Bilale et Danedjo Corporation.",
};

export default function PromotionsPage() {
  const promos = getPromoProducts();

  return (
    <>
      <PageHeader
        eyebrow="Offres en cours"
        title="Promotions du moment"
        description="Réductions, offres spéciales et produits vedettes — pour faire de bonnes affaires sur les essentiels du quotidien."
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {promos.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              Aucune promotion active pour le moment. Revenez bientôt !
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {promos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="mt-16 bg-gradient-to-br from-brand-blue to-brand-blue-light text-white rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              Une demande de devis particulière ?
            </h2>
            <p className="mt-3 text-slate-200 max-w-2xl mx-auto">
              Pour les commandes en gros (boutiques, restaurants, hôtels), contactez-nous
              directement pour un tarif personnalisé.
            </p>
            <a
              href={whatsappLink("Bonjour, je souhaite obtenir un devis pour une commande professionnelle.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-6 py-3 rounded-md font-semibold transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Demander un devis sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
