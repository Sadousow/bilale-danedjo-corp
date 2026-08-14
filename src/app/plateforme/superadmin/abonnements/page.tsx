import { platformDb } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-auth";
import { formatPrice, formatDate } from "@/lib/format";
import { effectiveStatus, subscriptionStatusLabels } from "@/lib/plans";
import type { SubscriptionStatus } from "@/lib/plans";
import CycleButton from "./CycleButton";
import { changePlanAction, markInvoicePaidAction } from "./actions";

export const dynamic = "force-dynamic";

const statusStyles: Record<SubscriptionStatus, string> = {
  ESSAI: "bg-amber-50 text-amber-700",
  ACTIF: "bg-emerald-50 text-emerald-700",
  IMPAYE: "bg-red-50 text-red-700",
  SUSPENDU: "bg-red-100 text-red-800",
  RESILIE: "bg-slate-100 text-slate-500",
};

export default async function SubscriptionsPage() {
  await requirePlatformUser();

  const [subscriptions, plans, pendingInvoices] = await Promise.all([
    platformDb.subscription.findMany({
      orderBy: { currentPeriodEnd: "asc" },
      include: { plan: true, tenant: { select: { name: true, slug: true } } },
    }),
    platformDb.plan.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    }),
    platformDb.subscriptionInvoice.findMany({
      where: { status: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { include: { tenant: { select: { name: true } } } },
      },
    }),
  ]);

  const now = new Date();

  // Revenu récurrent : on ne compte que ce qui est effectivement facturé.
  const mrr = subscriptions
    .filter((s) => {
      const status = effectiveStatus(
        {
          status: s.status as SubscriptionStatus,
          currentPeriodEnd: s.currentPeriodEnd,
          graceEndsAt: s.graceEndsAt,
        },
        now
      );
      return status === "ACTIF" || status === "IMPAYE";
    })
    .reduce((sum, s) => sum + s.plan.priceMonthly, 0);

  const outstanding = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Abonnements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenu mensuel récurrent : {formatPrice(mrr)} —{" "}
            {formatPrice(outstanding)} en attente de règlement
          </p>
        </div>
        <CycleButton />
      </div>

      {pendingInvoices.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">
              {pendingInvoices.length} facture(s) en attente
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Référence</th>
                <th className="text-left font-medium px-5 py-2.5">Boutique</th>
                <th className="text-left font-medium px-5 py-2.5">Période</th>
                <th className="text-right font-medium px-5 py-2.5">Montant</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {invoice.reference}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {invoice.subscription.tenant.name}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(invoice.periodStart)} —{" "}
                    {formatDate(invoice.periodEnd)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-800">
                    {formatPrice(invoice.amount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={markInvoicePaidAction}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <button
                        type="submit"
                        className="text-xs text-emerald-600 hover:underline"
                        title="Règlement reçu hors application"
                      >
                        Marquer réglée
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-3">Boutique</th>
                <th className="text-left font-medium px-4 py-3">Offre</th>
                <th className="text-right font-medium px-4 py-3">Montant</th>
                <th className="text-left font-medium px-4 py-3">Échéance</th>
                <th className="text-center font-medium px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((subscription) => {
                const status = effectiveStatus(
                  {
                    status: subscription.status as SubscriptionStatus,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    graceEndsAt: subscription.graceEndsAt,
                  },
                  now
                );

                return (
                  <tr key={subscription.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {subscription.tenant.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {subscription.tenant.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <form action={changePlanAction}>
                        <input
                          type="hidden"
                          name="subscriptionId"
                          value={subscription.id}
                        />
                        <select
                          name="planId"
                          defaultValue={subscription.planId}
                          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs"
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="ml-2 text-xs text-brand-blue hover:underline"
                        >
                          Changer
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatPrice(subscription.plan.priceMonthly)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(subscription.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
                      >
                        {subscriptionStatusLabels[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Le statut affiché est recalculé à partir des dates, indépendamment de la
        tâche planifiée : une boutique échue apparaît comme telle même si le
        passage quotidien n&apos;a pas tourné.
      </p>
    </>
  );
}
