import Link from "next/link";
import { CheckCircle2, ExternalLink, Search, Store } from "lucide-react";

import { formatDate } from "@/lib/format";
import { subscriptionStatusLabels } from "@/lib/plans";
import {
  alertLabels,
  filterLabels,
  type ShopFilter,
  type ShopRow,
} from "@/lib/console-filters";

const statusStyles: Record<string, string> = {
  ESSAI: "bg-amber-50 text-amber-700",
  ACTIF: "bg-emerald-50 text-emerald-700",
  IMPAYE: "bg-orange-50 text-orange-700",
  SUSPENDU: "bg-red-50 text-red-700",
  RESILIE: "bg-slate-100 text-slate-500",
};

function activityLabel(row: ShopRow): string {
  if (row.lastActivity) return formatDate(row.lastActivity);
  return "—";
}

/**
 * Message de liste vide.
 *
 * « Aucun résultat » n'aide personne : la même liste vide veut dire trois
 * choses différentes selon qu'on cherche, qu'on filtre, ou qu'on n'a encore
 * aucune boutique. Le cas « à relancer » vide est même une bonne nouvelle.
 */
function emptyState(query: string, filter: ShopFilter) {
  if (query) {
    return { Icon: Search, text: `Aucune boutique ne correspond à « ${query} ».` };
  }
  if (filter === "a-relancer") {
    return {
      Icon: CheckCircle2,
      text: "Rien à relancer : aucun marchand ne demande d'attention.",
    };
  }
  if (filter !== "tout") {
    return {
      Icon: Store,
      text: `Aucune boutique dans « ${filterLabels[filter]} ».`,
    };
  }
  return { Icon: Store, text: "Aucune boutique pour l'instant." };
}

export default function ShopTable({
  shops,
  protocol,
  root,
  query,
  filter,
}: {
  shops: ShopRow[];
  protocol: string;
  root: string;
  query: string;
  filter: ShopFilter;
}) {
  if (shops.length === 0) {
    const { Icon, text } = emptyState(query, filter);
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
        <Icon className="w-10 h-10 mx-auto text-slate-200" />
        <p className="mt-3">{text}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left font-medium px-4 py-3">Boutique</th>
              <th className="text-left font-medium px-4 py-3">Offre</th>
              <th className="text-right font-medium px-4 py-3">Produits</th>
              <th className="text-right font-medium px-4 py-3">Ventes</th>
              <th className="text-left font-medium px-4 py-3">
                Dernière activité
              </th>
              <th className="text-center font-medium px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shops.map((shop) => {
              const host = shop.host ?? `${shop.slug}.${root}`;
              const status = shop.subscription?.status ?? "RESILIE";
              const suspended =
                shop.tenantStatus === "SUSPENDU" || status === "SUSPENDU";

              return (
                <tr key={shop.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/boutiques/${shop.id}`}
                      className="font-medium text-slate-800 hover:text-brand-blue"
                    >
                      {shop.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <a
                        href={`${protocol}://${host}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-blue inline-flex items-center gap-1"
                      >
                        {host}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    {shop.alerts.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {shop.alerts.map((alert) => (
                          <span
                            key={alert}
                            className="inline-flex px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px]"
                          >
                            {alertLabels[alert]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {shop.subscription?.planName ?? "—"}
                    {shop.subscription && (
                      <p className="text-xs text-slate-400">
                        {shop.subscription.daysLeft >= 0
                          ? `${shop.subscription.daysLeft} j restants`
                          : `échu depuis ${-shop.subscription.daysLeft} j`}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-500">
                    {shop.counts.products}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {shop.counts.sales + shop.counts.orders}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {activityLabel(shop)}
                    <p className="text-xs text-slate-400">
                      créée le {formatDate(shop.createdAt)}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
                    >
                      {subscriptionStatusLabels[status]}
                    </span>
                    {suspended && shop.tenantStatus === "SUSPENDU" && (
                      <p className="mt-1 text-[11px] text-red-600">
                        fermée par la plateforme
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/superadmin/boutiques/${shop.id}`}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Ouvrir la fiche
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
