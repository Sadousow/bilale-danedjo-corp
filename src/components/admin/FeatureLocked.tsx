import Link from "next/link";
import { Lock, Check, ArrowRight } from "lucide-react";

import { featureDetails } from "@/lib/plans";
import { formatPrice } from "@/lib/format";
import type { FeatureGate } from "@/lib/subscription";

/**
 * Écran affiché à la place d'une section que l'offre ne couvre pas.
 *
 * Il remplace le 404 qui s'affichait auparavant — lequel ressemblait à une
 * panne plutôt qu'à une règle commerciale, et laissait le marchand sans la
 * moindre indication sur la marche à suivre.
 *
 * Trois choses doivent y figurer : **ce que la fonction apporte**, **combien
 * elle coûte**, et **où cliquer**. C'est l'instant où le marchand est le plus
 * disposé à monter d'offre : lui cacher le prix le ferait repartir.
 */
export default function FeatureLocked({
  gate,
  /** Version resserrée, pour une section à l'intérieur d'une page. */
  compact = false,
}: {
  gate: FeatureGate;
  compact?: boolean;
}) {
  if (gate.allowed) return null;

  const details = featureDetails[gate.feature];

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="flex items-center gap-2 font-medium text-slate-800">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          Compris à partir de l&apos;offre {gate.upgrade?.name ?? "supérieure"}
          {gate.upgrade && (
            <span className="text-slate-500 font-normal">
              — {formatPrice(gate.upgrade.priceMonthly)} / mois
            </span>
          )}
        </p>

        <ul className="mt-3 space-y-1.5">
          {details.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-sm text-slate-600"
            >
              <Check className="w-3.5 h-3.5 text-brand-gold-dark shrink-0 mt-0.5" />
              {benefit}
            </li>
          ))}
        </ul>

        <Link
          href="/admin/abonnement"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:text-brand-gold-dark"
        >
          Voir les offres
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>

        {/* L'espace est explicite : JSX le supprime entre une expression et
            le texte qui suit, et le titre se collait au verbe. */}
        <h1 className="mt-5 font-display text-2xl font-bold text-brand-blue">
          {details.title}
          {" n'est pas comprise dans votre offre"}
        </h1>

        <p className="mt-3 text-slate-600">
          Vous êtes actuellement sur l&apos;offre{" "}
          <strong className="text-slate-800">{gate.currentPlanName}</strong>.
          {gate.upgrade
            ? ` Cette section s'ouvre à partir de l'offre ${gate.upgrade.name}.`
            : " Contactez-nous pour l'activer."}
        </p>

        <ul className="mt-6 space-y-2.5">
          {details.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-700">
              <Check className="w-4 h-4 text-brand-gold-dark shrink-0 mt-0.5" />
              {benefit}
            </li>
          ))}
        </ul>

        {gate.upgrade && (
          <p className="mt-7 pt-5 border-t border-slate-200">
            <span className="text-2xl font-bold text-brand-blue">
              {formatPrice(gate.upgrade.priceMonthly)}
            </span>
            <span className="text-sm text-slate-500"> / mois</span>
            <span className="block text-xs text-slate-500 mt-1">
              Offre {gate.upgrade.name} — sans engagement, changement possible
              à tout moment.
            </span>
          </p>
        )}

        <Link
          href="/admin/abonnement"
          className="mt-6 inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-5 py-3 rounded-md transition-colors"
        >
          Voir les offres
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
