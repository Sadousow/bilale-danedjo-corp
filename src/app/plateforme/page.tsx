import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Globe,
  Minus,
  ScanLine,
  ShoppingBag,
} from "lucide-react";

import { platformDb } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/plans";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: ScanLine,
    title: "Caisse tactile",
    text: "Encaissez en quelques secondes. Le stock se met à jour tout seul, le reçu s'imprime au format rouleau.",
  },
  {
    icon: ShoppingBag,
    title: "Boutique en ligne",
    text: "Vos clients commandent depuis leur téléphone. Paiement à la livraison ou par Mobile Money.",
  },
  {
    icon: FileText,
    title: "Facturation",
    text: "Proformas, factures et bons de livraison conformes, avec NIF, RCCM et TVA.",
  },
  {
    icon: BarChart3,
    title: "Pilotage",
    text: "Chiffre d'affaires, marge, panier moyen, meilleures ventes — au jour le jour.",
  },
];

/**
 * Bord de ticket déchiré — la signature de la marque.
 *
 * Elle sépare le bandeau du reste de la page et se reconnaît sans le mot,
 * exactement comme sur le logo. Purement décorative, donc masquée aux
 * lecteurs d'écran.
 */
function TornEdge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block w-full h-4 ${className}`}
    >
      <path
        d="M0 0 h1200 v6 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 l-25 18 l-25 -18 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default async function PlatformHome() {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

  // Preuve sociale honnête et tarifs réels : tout vient de la base.
  let shops = 0;
  let plans: Awaited<ReturnType<typeof platformDb.plan.findMany>> = [];

  try {
    [shops, plans] = await Promise.all([
      platformDb.tenant.count({
        where: { status: { in: ["ACTIF", "ESSAI"] } },
      }),
      platformDb.plan.findMany({
        where: { active: true },
        orderBy: { position: "asc" },
      }),
    ]);
  } catch {
    shops = 0;
    plans = [];
  }

  // L'offre du milieu est celle qu'on met en avant.
  const highlighted = plans.length >= 2 ? plans[1].id : plans[0]?.id;

  return (
    <>
      {/* ---------------------------------------------------------- Bandeau */}
      <section className="bg-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-brand-gold-dark">
            {brand.slogan}
          </p>

          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-brand-blue leading-tight tracking-tight">
            Votre commerce en ligne,
            <br />
            de la caisse à la livraison
          </h1>

          <p className="mt-6 text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Une seule application pour tenir votre boutique : catalogue, caisse,
            stock, commandes en ligne et facturation. Sur votre propre adresse.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-7 py-3.5 rounded-md transition-colors"
            >
              Essayer {TRIAL_DAYS} jours gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#tarifs"
              className="inline-flex items-center justify-center border border-brand-blue/25 text-brand-blue hover:bg-brand-blue/5 font-semibold px-7 py-3.5 rounded-md transition-colors"
            >
              Voir les tarifs
            </a>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            Sans carte bancaire.
            {shops > 0 &&
              ` ${shops} boutique${shops > 1 ? "s" : ""} déjà en ligne.`}
          </p>
        </div>

        {/* La marque se referme sur le bord déchiré du ticket. */}
        <TornEdge className="text-white" />
      </section>

      {/* --------------------------------------------------- Fonctionnalités */}
      <section id="fonctionnalites" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-9">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-lg bg-brand-blue text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-brand-blue">
                      {feature.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      {feature.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Tarifs */}
      <section id="tarifs" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-brand-blue tracking-tight">
              Des tarifs clairs
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              {TRIAL_DAYS} jours d&apos;essai sur toutes les offres. Sans
              engagement, sans carte bancaire. Vous changez d&apos;offre quand
              votre commerce grandit.
            </p>
          </div>

          {plans.length === 0 ? (
            <p className="mt-10 text-center text-slate-500">
              Nos offres sont en cours de mise à jour.{" "}
              <Link href="/inscription" className="text-brand-blue underline">
                Contactez-nous
              </Link>
              .
            </p>
          ) : (
            <div className="mt-12 grid md:grid-cols-3 gap-6 items-start">
              {plans.map((plan) => {
                const featured = plan.id === highlighted;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border bg-white p-6 ${
                      featured
                        ? "border-brand-blue ring-2 ring-brand-blue/20 shadow-lg md:-mt-4 md:pb-10"
                        : "border-slate-200"
                    }`}
                  >
                    {featured && (
                      <p className="inline-block mb-3 text-xs font-semibold uppercase tracking-wide text-brand-blue bg-brand-gold/20 px-2.5 py-1 rounded-full">
                        Le plus choisi
                      </p>
                    )}

                    <h3 className="text-xl font-bold text-brand-blue">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 min-h-[2.5rem]">
                      {plan.description}
                    </p>

                    <p className="mt-4">
                      <span className="text-3xl font-bold text-brand-blue">
                        {formatPrice(plan.priceMonthly)}
                      </span>
                      <span className="text-sm text-slate-400"> / mois</span>
                    </p>

                    <ul className="mt-6 space-y-2 text-sm">
                      <li className="flex items-start gap-2 text-slate-700">
                        <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                        {plan.maxProducts > 0
                          ? `Jusqu'à ${plan.maxProducts} produits`
                          : "Produits illimités"}
                      </li>
                      <li className="flex items-start gap-2 text-slate-700">
                        <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                        {plan.maxUsers > 0
                          ? `${plan.maxUsers} utilisateurs`
                          : "Utilisateurs illimités"}
                      </li>
                      <li className="flex items-start gap-2 text-slate-700">
                        <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                        Caisse, stock, clients et rapports
                      </li>

                      {(
                        [
                          ["Boutique en ligne", plan.featureShop],
                          ["Facturation et bons de livraison", plan.featureInvoicing],
                          ["Votre propre nom de domaine", plan.featureDomain],
                        ] as const
                      ).map(([label, included]) => (
                        <li
                          key={label}
                          className={`flex items-start gap-2 ${
                            included ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          {included ? (
                            <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
                          ) : (
                            <Minus className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          {label}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/inscription"
                      className={`mt-7 flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-md transition-colors ${
                        featured
                          ? "bg-brand-blue hover:bg-brand-blue-light text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Commencer
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Paiement par Orange Money, MTN MoMo ou virement. Hébergement,
            sauvegardes et mises à jour compris.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- Adresse */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-brand-blue tracking-tight">
            Votre adresse, votre boutique
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Chaque commerce reçoit son adresse —{" "}
            <code className="bg-paper border border-slate-200 px-2 py-0.5 rounded text-sm text-brand-blue">
              votre-nom.{root}
            </code>{" "}
            — et peut brancher son propre nom de domaine.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500">
            <Globe className="w-4 h-4" />
            Certificat de sécurité inclus, quel que soit votre domaine
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Appel à l'action */}
      <section className="bg-brand-blue text-white">
        <TornEdge className="text-white rotate-180" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 pt-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ouvrez votre boutique aujourd&apos;hui
          </h2>
          <p className="mt-4 text-slate-200 leading-relaxed">
            {TRIAL_DAYS} jours pour essayer, sans carte bancaire et sans
            engagement. Si ça ne vous convient pas, vous ne payez rien.
          </p>
          <Link
            href="/inscription"
            className="mt-9 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-brand-blue font-semibold px-8 py-4 rounded-md transition-colors"
          >
            Ouvrir ma boutique
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
