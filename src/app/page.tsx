import Link from "next/link";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { categories, getPopularProducts, getPromoProducts } from "@/lib/products";
import { whatsappLink } from "@/lib/site";

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
                <div className="w-14 h-14 rounded-xl bg-brand-blue/5 flex items-center justify-center text-3xl group-hover:bg-brand-blue group-hover:scale-110 transition-all">
                  {cat.icon}
                </div>
                <h3 className="mt-5 font-display font-bold text-xl text-brand-blue">
                  {cat.label}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {cat.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-gold group-hover:gap-2 transition-all">
                  Voir les produits
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
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
            {[
              {
                icon: "🚚",
                title: "Livraison rapide",
                desc: "Livraison à Conakry et dans tout le pays sous 24 à 72 heures.",
              },
              {
                icon: "💯",
                title: "Qualité garantie",
                desc: "Produits sélectionnés rigoureusement chez des fournisseurs de confiance.",
              },
              {
                icon: "💬",
                title: "Service WhatsApp",
                desc: "Commandez directement par WhatsApp, conseil personnalisé.",
              },
              {
                icon: "💰",
                title: "Prix justes",
                desc: "Tarifs compétitifs pour particuliers, boutiques et professionnels.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-4">{feat.icon}</div>
                <h3 className="font-display font-bold text-lg text-brand-blue">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{feat.desc}</p>
              </div>
            ))}
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
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            Discuter sur WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
