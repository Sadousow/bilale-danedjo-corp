import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { platformDb } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-auth";
import { formatDate, formatDateTime, formatPrice, roleLabels } from "@/lib/format";
import {
  daysBetween,
  effectiveStatus,
  subscriptionStatusLabels,
  type SubscriptionStatus,
} from "@/lib/plans";
import { getShopDetail } from "@/lib/platform-shops";
import { changeTenantStatusAction } from "../../actions";
import ImpersonateButton from "./ImpersonateButton";
import PlanPicker from "./PlanPicker";
import InvoiceRow from "./InvoiceRow";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  ESSAI: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIF: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IMPAYE: "bg-orange-50 text-orange-700 border-orange-200",
  SUSPENDU: "bg-red-50 text-red-700 border-red-200",
  RESILIE: "bg-slate-100 text-slate-500 border-slate-200",
};

type Props = {
  params: Promise<{ id: string }>;
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">
        {value}
      </span>
    </div>
  );
}

export default async function ShopDetailPage({ params }: Props) {
  await requirePlatformUser();

  const { id } = await params;

  const [detail, plans] = await Promise.all([
    getShopDetail(id),
    platformDb.plan.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    }),
  ]);

  if (!detail) notFound();

  const { tenant, revenue, salesCount, lastActivity } = detail;
  const settings = tenant.settings;
  const sub = tenant.subscription;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = root.startsWith("localhost") ? "http" : "https";
  const verified = tenant.domains.find((d) => d.verified);
  const host = verified?.host ?? `${tenant.slug}.${root}`;

  const status: SubscriptionStatus | null = sub
    ? effectiveStatus(
        {
          status: sub.status as SubscriptionStatus,
          currentPeriodEnd: sub.currentPeriodEnd,
          graceEndsAt: sub.graceEndsAt,
        },
        new Date()
      )
    : null;

  const suspended = tenant.status === "SUSPENDU";
  const daysLeft = sub ? daysBetween(new Date(), sub.currentPeriodEnd) : 0;

  return (
    <>
      <Link
        href="/superadmin"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Toutes les boutiques
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-slate-800">
              {tenant.name}
            </h1>
            {status && (
              <span
                className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${statusStyles[status]}`}
              >
                {subscriptionStatusLabels[status]}
              </span>
            )}
            {suspended && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-medium text-red-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                Fermée par la plateforme
              </span>
            )}
          </div>
          <a
            href={`${protocol}://${host}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-blue"
          >
            {host}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ImpersonateButton tenantId={tenant.id} />

          <form action={changeTenantStatusAction}>
            <input type="hidden" name="id" value={tenant.id} />
            <input
              type="hidden"
              name="status"
              value={suspended ? "ACTIF" : "SUSPENDU"}
            />
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white ${
                suspended
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {suspended ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              {suspended ? "Réactiver" : "Suspendre"}
            </button>
          </form>
        </div>
      </div>

      {suspended && (
        <p className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          Tout est fermé pour ce marchand : vitrine, back-office et caisse. Ses
          employés ne peuvent plus se connecter. « Se connecter en tant que »
          reste possible depuis cette console pour inspecter la boutique.
        </p>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <Card title="Coordonnées">
          <Line label="Raison sociale" value={settings?.companyName ?? "—"} />
          <Line
            label="Téléphone"
            value={
              settings?.companyPhone ? (
                <a
                  href={`tel:${settings.companyPhone}`}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {settings.companyPhone}
                </a>
              ) : (
                <span className="text-slate-400">non renseigné</span>
              )
            }
          />
          <Line
            label="Email"
            value={
              settings?.companyEmail ? (
                <a
                  href={`mailto:${settings.companyEmail}`}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {settings.companyEmail}
                </a>
              ) : (
                <span className="text-slate-400">non renseigné</span>
              )
            }
          />
          <Line label="Adresse" value={settings?.companyAddress ?? "—"} />
          <Line label="Inscrite le" value={formatDate(tenant.createdAt)} />
        </Card>

        <Card title="Activité">
          <Line
            label="Vitrine"
            value={
              settings?.shopPublished ? (
                <span className="text-emerald-600">publiée</span>
              ) : (
                <span className="text-amber-600">jamais publiée</span>
              )
            }
          />
          <Line label="Produits" value={tenant._count.products} />
          <Line
            label="Ventes en caisse"
            value={`${salesCount} — ${formatPrice(revenue)}`}
          />
          <Line label="Commandes en ligne" value={tenant._count.orders} />
          <Line label="Clients" value={tenant._count.customers} />
          <Line
            label="Dernière vente"
            value={
              lastActivity ? (
                formatDate(lastActivity)
              ) : (
                <span className="text-slate-400">aucune</span>
              )
            }
          />
        </Card>

        <Card title="Abonnement">
          {sub ? (
            <>
              <Line label="Offre" value={sub.plan.name} />
              <Line
                label="Prix mensuel"
                value={formatPrice(sub.plan.priceMonthly)}
              />
              <Line
                label={status === "ESSAI" ? "Fin d'essai" : "Fin de période"}
                value={
                  <>
                    {formatDate(sub.currentPeriodEnd)}
                    <span
                      className={`ml-1.5 text-xs ${daysLeft < 0 ? "text-red-600" : "text-slate-400"}`}
                    >
                      {daysLeft >= 0
                        ? `(${daysLeft} j)`
                        : `(échu depuis ${-daysLeft} j)`}
                    </span>
                  </>
                }
              />
              <Line
                label="Quotas"
                value={`${sub.plan.maxProducts || "∞"} produits · ${sub.plan.maxUsers || "∞"} comptes`}
              />
              <div className="mt-4">
                <PlanPicker
                  subscriptionId={sub.id}
                  currentPlanId={sub.planId}
                  plans={plans.map((p) => ({
                    id: p.id,
                    name: p.name,
                    priceMonthly: p.priceMonthly,
                  }))}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Aucun abonnement rattaché à cette boutique.
            </p>
          )}
        </Card>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <h2 className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 border-b border-slate-100">
          Factures d&apos;abonnement
        </h2>
        {!sub || sub.invoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            Aucune facture émise.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-5 py-2.5">
                    Référence
                  </th>
                  <th className="text-left font-medium px-5 py-2.5">Période</th>
                  <th className="text-right font-medium px-5 py-2.5">
                    Montant
                  </th>
                  <th className="text-center font-medium px-5 py-2.5">État</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sub.invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={{
                      id: invoice.id,
                      reference: invoice.reference,
                      planName: invoice.planName,
                      amount: invoice.amount,
                      periodStart: invoice.periodStart,
                      periodEnd: invoice.periodEnd,
                      status: invoice.status,
                      paidAt: invoice.paidAt,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <h2 className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 border-b border-slate-100">
            Comptes ({tenant.users.length})
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {tenant.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-500 whitespace-nowrap">
                    {roleLabels[user.role]}
                    {!user.active && (
                      <p className="text-xs text-slate-400">désactivé</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <h2 className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 border-b border-slate-100">
            Adresses
          </h2>
          <div className="px-5 py-3 space-y-2">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4 text-slate-400" />
              {tenant.slug}.{root}
              <span className="text-xs text-slate-400">(par défaut)</span>
            </p>
            {tenant.domains.map((domain) => (
              <p
                key={domain.id}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <Globe className="w-4 h-4 text-slate-400" />
                {domain.host}
                <span
                  className={`text-xs ${domain.verified ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {domain.verified ? "vérifié" : "en attente"}
                </span>
              </p>
            ))}
            {tenant.domains.length === 0 && (
              <p className="text-xs text-slate-400">
                Aucun domaine personnalisé.
              </p>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Encaissement Djomy :{" "}
              {tenant.djomyEnabled ? (
                <span className="text-emerald-600">configuré</span>
              ) : (
                "non configuré"
              )}
              {" · "}Mis à jour le {formatDateTime(tenant.updatedAt)}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
