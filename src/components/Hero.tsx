import Link from "next/link";
import { siteConfig, whatsappLink } from "@/lib/site";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient">
      <div className="absolute inset-0 opacity-10" aria-hidden>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-gold rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up text-white">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-brand-gold-light bg-white/10 px-4 py-1.5 rounded-full backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
              Distribution & commerce — Conakry
            </span>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              {siteConfig.slogan.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-brand-gold-light">{siteConfig.slogan.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-5 text-lg text-slate-200 max-w-xl">
              Alimentation générale, produits d&apos;entretien et électroménager —
              à des prix justes, livrés rapidement à Conakry et partout en Guinée.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/produits"
                className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-6 py-3.5 rounded-md font-semibold shadow-lg transition-colors"
              >
                Découvrir nos produits
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <a
                href={whatsappLink("Bonjour, je souhaite passer commande.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-6 py-3.5 rounded-md font-semibold transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                Commander sur WhatsApp
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <p className="text-3xl font-bold text-brand-gold-light">500+</p>
                <p className="text-xs text-slate-300 mt-1">Produits disponibles</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-gold-light">1 000+</p>
                <p className="text-xs text-slate-300 mt-1">Clients satisfaits</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-gold-light">24h</p>
                <p className="text-xs text-slate-300 mt-1">Délai moyen</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block animate-fade-up [animation-delay:200ms]">
            <div className="relative aspect-square rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-3 h-full">
                <div className="rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-dark p-5 flex flex-col justify-end text-white">
                  <span className="text-3xl">🛒</span>
                  <p className="font-semibold mt-3">Alimentation générale</p>
                  <p className="text-xs opacity-90 mt-1">Riz, sucre, huile, conserves…</p>
                </div>
                <div className="rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue">
                  <span className="text-3xl">🧴</span>
                  <p className="font-semibold mt-3">Produits d&apos;entretien</p>
                  <p className="text-xs opacity-80 mt-1">Détergents, javel, savons…</p>
                </div>
                <div className="rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue col-span-2">
                  <span className="text-3xl">🏠</span>
                  <p className="font-semibold mt-3">Électroménager</p>
                  <p className="text-xs opacity-80 mt-1">Réfrigérateurs, téléviseurs, ventilateurs, cuisinières…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
