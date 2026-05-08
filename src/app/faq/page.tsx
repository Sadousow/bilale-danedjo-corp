import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions fréquentes — commandes, livraison, paiement, garanties chez Bilale et Danedjo Corporation.",
};

const faqs = [
  {
    q: "Comment passer commande ?",
    a: "Vous pouvez commander directement depuis le site en cliquant sur le bouton « Commander » sur chaque produit — vous serez redirigé vers WhatsApp avec le message pré-rempli. Vous pouvez aussi nous appeler ou utiliser le formulaire de contact.",
  },
  {
    q: "Quels sont les délais de livraison ?",
    a: "À Conakry : livraison sous 24 heures pour les commandes passées avant 15h. Dans le reste de la Guinée : 48 à 72 heures selon la destination. Nous confirmons toujours le délai exact avant validation de la commande.",
  },
  {
    q: "Quels sont les moyens de paiement acceptés ?",
    a: "Espèces à la livraison, mobile money (Orange Money, MTN Money), virement bancaire pour les commandes professionnelles. Le paiement à la livraison est notre formule la plus utilisée.",
  },
  {
    q: "Livrez-vous en dehors de Conakry ?",
    a: "Oui, nous livrons partout en Guinée. Les frais de livraison varient selon la destination et le volume de la commande. Demandez un devis par WhatsApp pour obtenir un tarif précis.",
  },
  {
    q: "Faites-vous des prix de gros pour les boutiques et restaurants ?",
    a: "Oui, nous proposons des tarifs préférentiels pour les commandes en quantité destinées aux boutiques, restaurants, hôtels et entreprises. Contactez-nous pour un devis sur mesure.",
  },
  {
    q: "Les électroménagers sont-ils sous garantie ?",
    a: "Tous nos appareils électroménagers sont neufs et bénéficient d'une garantie constructeur (durée variable selon le produit, généralement 6 à 24 mois). La garantie est précisée pour chaque produit.",
  },
  {
    q: "Que faire si un produit ne me convient pas ?",
    a: "Si vous rencontrez un problème avec un produit, contactez-nous dans les 48 heures suivant la livraison. Nous étudierons chaque demande de retour ou d'échange au cas par cas.",
  },
  {
    q: "Puis-je récupérer ma commande sur place ?",
    a: "Oui, le retrait en magasin est possible. Indiquez-le lors de la commande et nous vous préparons votre commande pour le retrait.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Aide & support"
        title="Questions fréquentes"
        description="Toutes les réponses aux questions les plus courantes. Vous ne trouvez pas votre réponse ? Contactez-nous."
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <details
                key={i}
                className="group bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-brand-blue/40 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-brand-blue">
                  {item.q}
                  <svg className="w-5 h-5 text-brand-gold group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 bg-brand-blue text-white rounded-2xl p-8 text-center">
            <h3 className="font-display text-xl font-bold">Une autre question ?</h3>
            <p className="mt-2 text-slate-200 text-sm">
              Notre équipe répond rapidement sur WhatsApp ou via le formulaire de contact.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <a
                href={whatsappLink("Bonjour, j'ai une question.")}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-gold hover:bg-brand-gold-dark text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
              >
                WhatsApp
              </a>
              <Link
                href="/contact"
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
              >
                Formulaire de contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
