import Link from "next/link";
import { ArrowRight, ShoppingBasket, SprayCan, Refrigerator } from "lucide-react";
import { siteConfig, whatsappLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";

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
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappLink("Bonjour, je souhaite passer commande.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-6 py-3.5 rounded-md font-semibold transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
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
                  <ShoppingBasket className="w-9 h-9" strokeWidth={1.5} />
                  <p className="font-semibold mt-3">Alimentation générale</p>
                  <p className="text-xs opacity-90 mt-1">Riz, sucre, huile, conserves…</p>
                </div>
                <div className="rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue">
                  <SprayCan className="w-9 h-9" strokeWidth={1.5} />
                  <p className="font-semibold mt-3">Produits d&apos;entretien</p>
                  <p className="text-xs opacity-80 mt-1">Détergents, javel, savons…</p>
                </div>
                <div className="rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue col-span-2">
                  <Refrigerator className="w-9 h-9" strokeWidth={1.5} />
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
