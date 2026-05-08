import type { Metadata } from "next";
import { Award, Handshake, Headphones, Heart } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Découvrez Bilale et Danedjo Corporation SARLU — entreprise guinéenne spécialisée dans la distribution et le commerce de détail.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Notre entreprise"
        title="À propos de Bilale et Danedjo Corporation"
        description="Une entreprise guinéenne au service des familles, boutiques, restaurants, hôtels et entreprises depuis sa création."
      />

      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6 text-slate-700 leading-relaxed">
              <h2 className="font-display text-2xl font-bold text-brand-blue">
                Notre histoire
              </h2>
              <p>
                {siteConfig.name} est une entreprise guinéenne spécialisée dans la
                distribution et le commerce de détail. Implantée à Conakry, elle
                s&apos;est rapidement imposée comme un partenaire de confiance pour les
                particuliers et les professionnels grâce à la qualité de ses produits
                et à la fiabilité de ses services.
              </p>
              <p>
                De l&apos;alimentation générale aux produits d&apos;entretien en
                passant par l&apos;électroménager, nous accompagnons le quotidien des
                familles guinéennes ainsi que les besoins logistiques des boutiques,
                restaurants, hôtels et entreprises.
              </p>

              <h2 className="font-display text-2xl font-bold text-brand-blue mt-10">
                Notre mission
              </h2>
              <p>
                Offrir à nos clients des produits de qualité à des prix justes, avec
                un service client exemplaire et une livraison rapide partout en
                Guinée. Nous voulons être le partenaire du quotidien sur lequel chacun
                peut compter.
              </p>

              <h2 className="font-display text-2xl font-bold text-brand-blue mt-10">
                Notre vision
              </h2>
              <p>
                Devenir une référence du commerce général en Guinée en alliant
                tradition commerçante et outils modernes — catalogue digital, commande
                rapide par WhatsApp, livraison à domicile et service après-vente.
              </p>
            </div>

            <aside className="space-y-6">
              <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-xl p-6">
                <h3 className="font-display font-bold text-brand-blue text-lg">Nos valeurs</h3>
                <ul className="mt-4 space-y-4 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <Award className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span><strong className="text-brand-blue">Qualité</strong> — produits sélectionnés avec soin.</span>
                  </li>
                  <li className="flex gap-3">
                    <Handshake className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span><strong className="text-brand-blue">Confiance</strong> — relation durable avec nos clients.</span>
                  </li>
                  <li className="flex gap-3">
                    <Headphones className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span><strong className="text-brand-blue">Service</strong> — réactivité et conseil personnalisé.</span>
                  </li>
                  <li className="flex gap-3">
                    <Heart className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span><strong className="text-brand-blue">Engagement</strong> — au service du marché guinéen.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-brand-blue text-white rounded-xl p-6">
                <h3 className="font-display font-bold text-lg">Quelques chiffres</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-brand-gold-light">500+</p>
                    <p className="text-xs text-slate-200">Produits</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-gold-light">1 000+</p>
                    <p className="text-xs text-slate-200">Clients</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-gold-light">3</p>
                    <p className="text-xs text-slate-200">Catégories</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-gold-light">24h</p>
                    <p className="text-xs text-slate-200">Délai moyen</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
