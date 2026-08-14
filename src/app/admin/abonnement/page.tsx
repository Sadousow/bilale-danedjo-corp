import { Check, Clock, Lock, Minus } from "lucide-react";

import { platformDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getTenantSubscription, productQuota, userQuota } from "@/lib/subscription";
import { formatPrice, formatDate, formatDateTime } from "@/lib/format";
import {
  isShopClosed,
  pendingPlanEffectiveOn,
  subscriptionStatusLabels,
} from "@/lib/plans";
import { Card, PageTitle, Badge, EmptyState } from "@/components/admin/ui";
import PlanButton from "./PlanButton";
import PayInvoice from "./PayInvoice";
import { cancelPendingPlanAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ ferme?: string; paiement?: string }>;
};

const statusTone = {
  ESSAI: "gold",
  ACTIF: "green",
  IMPAYE: "red",
  SUSPENDU: "red",
  RESILIE: "slate",
} as const;

function Quota({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit <= 0;
  const ratio = unlimited ? 0 : Math.min(1, used / limit);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-800 font-medium">
          {used}
          {unlimited ? "" : ` / ${limit}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            ratio >= 1
              ? "bg-red-500"
              : ratio >= 0.8
                ? "bg-amber-500"
                : "bg-brand-blue"
          }`}
          style={{ width: unlimited ? "8%" : `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
      {unlimited && (
        <p className="mt-1 text-xs text-slate-400">Sans limite</p>
      )}
    </div>
  );
}

export default async function SubscriptionPage({ searchParams }: Props) {
  await requireRole("ADMIN");
  const tenant = await requireTenant();
  const { ferme, paiement } = await searchParams;

  const [subscription, products, users, plans, invoices, payer, settings] =
    await Promise.all([
      getTenantSubscription(),
      productQuota(),
      userQuota(),
      platformDb.plan.findMany({
        where: { active: true },
        orderBy: { position: "asc" },
      }),
      platformDb.subscriptionInvoice.findMany({
        where: { subscription: { tenantId: tenant.id } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      platformDb.subscription.findUnique({
        where: { tenantId: tenant.id },
        select: { billingPhone: true },
      }),
      platformDb.settings.findUnique({
        where: { tenantId: tenant.id },
        select: { companyPhone: true, whatsappNumber: true },
      }),
    ]);

  const pending = invoices.find((i) => i.status === "EN_ATTENTE");

  // Un numéro déjà connu évite de le redemander au moment de payer.
  const hasPayerNumber = Boolean(
    payer?.billingPhone || settings?.whatsappNumber || settings?.companyPhone
  );

  // Une date au passé ne veut rien dire : dans ce cas la baisse s'applique au
  // prochain règlement.
  const pendingOn = pendingPlanEffectiveOn(subscription.currentPeriodEnd);

  return (
    <>
      <PageTitle
        title="Mon abonnement"
        description="Votre offre, vos limites et vos factures"
      />

      {/* Renvoyé ici depuis une section fermée : sans explication, le
          marchand croit à une panne et appelle. */}
      {ferme === "1" && isShopClosed(subscription.status) && (
        <Card className="mb-6 border-red-200 bg-red-50 p-5">
          <p className="flex items-start gap-2.5 font-semibold text-red-900">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            Cette section est fermée tant que l&apos;abonnement n&apos;est pas
            réglé.
          </p>
          <p className="mt-1.5 pl-6 text-sm text-red-800">
            Vous gardez l&apos;accès à cette page et à vos rapports, et votre
            caisse reste ouverte. Rien n&apos;est supprimé : tout revient dès le
            règlement.
          </p>
        </Card>
      )}

      {paiement === "recu" && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-start gap-2.5 text-sm text-emerald-900">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            {/* Le webhook fait foi, pas ce retour d'écran : Djomy renvoie le
                payeur avant d'avoir toujours confirmé la transaction. */}
            Merci. Votre paiement est en cours de confirmation — l&apos;état de
            la facture ci-dessous se mettra à jour dans quelques instants.
          </p>
        </Card>
      )}

      {paiement === "annule" && (
        <Card className="mb-6 border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            Paiement abandonné. Votre facture reste en attente, vous pouvez
            réessayer quand vous voulez.
          </p>
        </Card>
      )}

      {subscription.pendingPlan && (
        <Card className="mb-6 border-brand-blue bg-blue-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="flex items-start gap-2.5 text-sm text-slate-700">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
              <span>
                Vous passerez à l&apos;offre{" "}
                <strong>{subscription.pendingPlan.name}</strong> (
                {formatPrice(subscription.pendingPlan.priceMonthly)} / mois){" "}
                {pendingOn ? (
                  <>
                    le <strong>{formatDate(pendingOn)}</strong>
                  </>
                ) : (
                  <strong>dès le règlement de votre facture</strong>
                )}
                . D&apos;ici là, rien ne change.
              </span>
            </p>
            <form action={cancelPendingPlanAction}>
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-brand-blue underline whitespace-nowrap"
              >
                Annuler ce changement
              </button>
            </form>
          </div>
        </Card>
      )}

      {pending && (
        <Card className="mb-6 border-brand-gold bg-amber-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-semibold text-amber-900">
                Facture {pending.reference} — {formatPrice(pending.amount)}
              </p>
              <p className="text-sm text-amber-800">
                Période du {formatDate(pending.periodStart)} au{" "}
                {formatDate(pending.periodEnd)}
              </p>
            </div>

            <PayInvoice
              paymentUrl={pending.paymentUrl}
              hasPayerNumber={hasPayerNumber}
            />
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="font-display text-xl font-bold text-brand-blue">
              {subscription.plan.name}
            </h2>
            <Badge tone={statusTone[subscription.status]}>
              {subscriptionStatusLabels[subscription.status]}
            </Badge>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Montant mensuel</dt>
              <dd className="font-medium text-slate-800">
                {subscription.plan.priceMonthly > 0
                  ? formatPrice(subscription.plan.priceMonthly)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">
                {subscription.status === "ESSAI"
                  ? "Fin de l'essai"
                  : "Prochaine échéance"}
              </dt>
              <dd className="font-medium text-slate-800">
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
            {subscription.graceEndsAt && subscription.status === "IMPAYE" && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Fermeture prévue le</dt>
                <dd className="font-medium text-red-600">
                  {formatDate(subscription.graceEndsAt)}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-5 sm:p-6 space-y-5">
          <h2 className="font-semibold text-slate-800">Utilisation</h2>
          <Quota label="Produits" used={products.used} limit={products.limit} />
          <Quota label="Utilisateurs" used={users.used} limit={users.limit} />
        </Card>
      </div>

      <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
        Les offres
      </h2>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const current = plan.id === subscription.plan.id;
          const queued = plan.id === subscription.pendingPlan?.id;
          return (
            <Card
              key={plan.id}
              className={`flex flex-col p-5 ${current ? "border-brand-blue ring-1 ring-brand-blue" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-800">{plan.name}</h3>
                {current && <Badge tone="blue">Votre offre</Badge>}
                {queued && !current && <Badge tone="gold">Programmée</Badge>}
              </div>

              <p className="mt-2 text-2xl font-bold text-brand-blue">
                {formatPrice(plan.priceMonthly)}
                <span className="text-sm font-normal text-slate-400"> / mois</span>
              </p>

              <p className="mt-2 text-sm text-slate-500">{plan.description}</p>

              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="flex items-center gap-2 text-slate-600">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {plan.maxProducts > 0
                    ? `${plan.maxProducts} produits`
                    : "Produits illimités"}
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {plan.maxUsers > 0
                    ? `${plan.maxUsers} utilisateurs`
                    : "Utilisateurs illimités"}
                </li>
                {(
                  [
                    ["Boutique en ligne", plan.featureShop],
                    ["Facturation", plan.featureInvoicing],
                    ["Domaine personnalisé", plan.featureDomain],
                  ] as const
                ).map(([label, enabled]) => (
                  <li
                    key={label}
                    className={`flex items-center gap-2 ${enabled ? "text-slate-600" : "text-slate-300"}`}
                  >
                    {enabled ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {label}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {current ? (
                  <p className="mt-4 text-center text-xs text-slate-400">
                    Offre en cours
                  </p>
                ) : queued ? (
                  <p className="mt-4 text-center text-xs text-slate-400">
                    {pendingOn
                      ? `Prend effet le ${formatDate(pendingOn)}`
                      : "Prend effet dès le règlement"}
                  </p>
                ) : (
                  <PlanButton
                    planId={plan.id}
                    direction={
                      plan.priceMonthly > subscription.plan.priceMonthly
                        ? "up"
                        : "down"
                    }
                    effectiveOn={pendingOn ? formatDate(pendingOn) : null}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mb-8 text-sm text-slate-500">
        Monter d&apos;offre prend effet immédiatement — la différence est
        reportée sur votre prochaine facture. Descendre prend effet à
        l&apos;échéance : vous avez déjà réglé la période en cours, vous la
        terminez avec l&apos;offre payée.
      </p>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Mes factures</h2>
        </div>

        {invoices.length === 0 ? (
          <EmptyState>Aucune facture pour l&apos;instant.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Référence</th>
                <th className="text-left font-medium px-5 py-2.5">Période</th>
                <th className="text-right font-medium px-5 py-2.5">Montant</th>
                <th className="text-center font-medium px-5 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {invoice.reference}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(invoice.periodStart)} —{" "}
                    {formatDate(invoice.periodEnd)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-800">
                    {formatPrice(invoice.amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {invoice.status === "PAYEE" ? (
                      <>
                        <Badge tone="green">Réglée</Badge>
                        {invoice.paidAt && (
                          <span className="block text-xs text-slate-400 mt-0.5">
                            {formatDateTime(invoice.paidAt)}
                          </span>
                        )}
                      </>
                    ) : invoice.status === "EN_ATTENTE" ? (
                      <Badge tone="gold">En attente</Badge>
                    ) : (
                      <Badge tone="red">
                        {invoice.status === "ECHOUEE" ? "Échouée" : "Annulée"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
