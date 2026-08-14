import Link from "next/link";
import { TrendingUp, Clock, AlertTriangle, EyeOff } from "lucide-react";

import { formatPrice } from "@/lib/format";
import type { PlatformStats } from "@/lib/platform-stats";

/**
 * Les chiffres qui décident, en tête de console.
 *
 * Quatre seulement, et c'est délibéré : un tableau de bord qui affiche vingt
 * indicateurs n'en fait lire aucun. Ceux-ci répondent aux seules questions
 * qu'on se pose vraiment le matin — combien ça rapporte, qui est sur le
 * départ, qui doit de l'argent, et qui n'a jamais démarré.
 */
export default function StatsBoard({ stats }: { stats: PlatformStats }) {
  const cards = [
    {
      icon: TrendingUp,
      label: "Recette mensuelle",
      value: formatPrice(stats.mrr),
      hint:
        stats.trialPotential > 0
          ? `+ ${formatPrice(stats.trialPotential)} si les essais se convertissent`
          : `${stats.byStatus.ACTIF} boutique${stats.byStatus.ACTIF > 1 ? "s" : ""} payante${stats.byStatus.ACTIF > 1 ? "s" : ""}`,
      tone: "text-brand-blue",
      href: "/superadmin/abonnements",
    },
    {
      icon: Clock,
      label: "Essais en cours",
      value: String(stats.byStatus.ESSAI),
      hint:
        stats.trialsEndingSoon > 0
          ? `${stats.trialsEndingSoon} se termine${stats.trialsEndingSoon > 1 ? "nt" : ""} sous 7 jours`
          : "Aucun ne se termine cette semaine",
      tone: stats.trialsEndingSoon > 0 ? "text-amber-600" : "text-slate-700",
      href: "/superadmin?filtre=essai",
    },
    {
      icon: AlertTriangle,
      label: "Impayés",
      value: formatPrice(stats.unpaidInvoices.amount),
      hint: `${stats.unpaidInvoices.count} facture${stats.unpaidInvoices.count > 1 ? "s" : ""} en attente`,
      tone: stats.unpaidInvoices.count > 0 ? "text-red-600" : "text-slate-700",
      href: "/superadmin/abonnements",
    },
    {
      icon: EyeOff,
      label: "Jamais publiées",
      value: String(stats.neverPublished),
      hint:
        stats.neverPublished > 0
          ? "Inscrites, jamais ouvertes au public"
          : "Toutes les boutiques sont ouvertes",
      tone: stats.neverPublished > 0 ? "text-amber-600" : "text-slate-700",
      href: "/superadmin?filtre=jamais-publiee",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-blue transition-colors"
          >
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Icon className="w-3.5 h-3.5" />
              {card.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${card.tone}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </Link>
        );
      })}
    </div>
  );
}
