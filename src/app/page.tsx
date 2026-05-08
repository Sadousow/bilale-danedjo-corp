import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, MessageCircle, BadgePercent } from "lucide-react";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import CategoryIcon from "@/components/CategoryIcon";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { categories, getPopularProducts, getPromoProducts } from "@/lib/products";
import { whatsappLink } from "@/lib/site";

const features = [
  {
    icon: Truck,
    title: "Livraison rapide",
    desc: "Livraison à Conakry et dans tout le pays sous 24 à 72 heures.",
  },
  {
    icon: ShieldCheck,
    title: "Qualité garantie",
    desc: "Produits sélectionnés rigoureusement chez des fournisseurs de confiance.",
  },
  {
    icon: MessageCircle,
    title: "Service WhatsApp",
    desc: "Commandez directement par WhatsApp, conseil personnalisé.",
  },
  {
    icon: BadgePercent,
    title: "Prix justes",
    desc: "Tarifs compétitifs pour particuliers, boutiques et professionnels.",
  },
];

export default function HomePage() {
  const popular = getPopularProducts(8);
  const promos = getPromoProducts().slice(0, 3);

  return (
    <>
      <Hero />

      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Nos catégories"
            title="Tout ce qu'il faut pour votre quotidien"
            description="Trois grandes familles de produits pour les particuliers, les boutiques et les professionnels en Guinée."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={`/produits?cat=${cat.key}`}
                className="group bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 hover:border-brand-gold transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white group-hover:scale-110 transition-all">
                  <CategoryIcon category={cat.key} className="w-7 h-7" />
                </div>
                <h3 className="mt-5 font-display font-bold text-xl text-brand-blue">
                  {cat.label}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {cat.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-gold group-hover:gap-2 transition-all">
                  Voir les produits
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Nos meilleures ventes"
              title="Produits populaires"
              description="Sélection des produits les plus appréciés de nos clients."
              align="left"
            />
            <Link
              href="/produits"
              className="text-sm font-semibold text-brand-blue hover:text-brand-gold inline-flex items-center gap-1"
            >
              Voir tout le catalogue
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-5">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="py-16 sm:py-20 bg-gradient-to-br from-brand-blue to-brand-blue-light text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-white">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold-light mb-3">
                  Offres en cours
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Promotions du moment
                </h2>
                <p className="mt-4 text-slate-200">
                  Profitez de nos prix spéciaux sur une sélection de produits.
                </p>
              </div>
              <Link
                href="/promotions"
                className="text-sm font-semibold text-brand-gold-light hover:text-white inline-flex items-center gap-1"
              >
                Toutes les promotions
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {promos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Pourquoi nous choisir"
            title="Un partenaire fiable au quotidien"
          />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-brand-gold/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-brand-blue">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-brand-blue-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Prêt à passer votre commande ?
          </h2>
          <p className="mt-4 text-slate-300 text-lg">
            Discutez directement avec notre équipe sur WhatsApp — réponse rapide, devis sur mesure.
          </p>
          <a
            href={whatsappLink("Bonjour, je souhaite passer commande.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-8 py-4 rounded-md font-semibold shadow-lg transition-colors"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Discuter sur WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
