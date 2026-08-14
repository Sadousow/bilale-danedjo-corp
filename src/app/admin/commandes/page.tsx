import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import { formatPrice, formatDateTime } from "@/lib/format";
import {
  displayPhone,
  orderPaymentMethodLabels,
  orderPaymentStatusLabels,
  orderStatusLabels,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders";
import { Card, PageTitle, EmptyState, Badge, StatCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type Props = {
  searchParams: Promise<{ statut?: string; q?: string; page?: string }>;
};

export default async function OrdersPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");

  const gate = await featureGate("shop");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;

  const { statut, q, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (statut) where.status = statut as OrderStatus;
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { clientPhone: { contains: q } },
    ];
  }

  const [orders, total, pendingCount, todayAgg] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { status: "RECUE" } }),
    prisma.order.aggregate({
      where: {
        status: { not: "ANNULEE" },
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <>
      <PageTitle
        title="Commandes en ligne"
        description={`${total} commande(s)`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="À traiter"
          value={String(pendingCount)}
          tone={pendingCount ? "danger" : "success"}
          hint="Commandes non confirmées"
        />
        <StatCard
          label="Commandes du jour"
          value={String(todayAgg._count)}
        />
        <StatCard
          label="Montant du jour"
          value={formatPrice(todayAgg._sum.total ?? 0)}
          tone="gold"
        />
      </div>

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <select
            name="statut"
            defaultValue={statut ?? ""}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(orderStatusLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Référence, nom ou téléphone…"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700"
          >
            Filtrer
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState>Aucune commande pour l&apos;instant.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Référence</th>
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Zone</th>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-center font-medium px-4 py-3">Statut</th>
                  <th className="text-left font-medium px-4 py-3">Paiement</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const status = o.status as OrderStatus;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/commandes/${o.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {o.reference}
                        </Link>
                        <span className="block text-xs text-slate-400">
                          {o._count.items} article(s)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-slate-800">{o.clientName}</span>
                        <span className="block text-xs text-slate-400">
                          {displayPhone(o.clientPhone)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{o.zoneName}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={orderStatusTone[status]}>
                          {orderStatusLabels[status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-xs text-slate-500">
                          {orderPaymentMethodLabels[o.paymentMethod]}
                        </span>
                        <Badge
                          tone={
                            o.paymentStatus === "PAYEE"
                              ? "green"
                              : o.paymentStatus === "ECHOUEE"
                                ? "red"
                                : "gold"
                          }
                        >
                          {orderPaymentStatusLabels[o.paymentStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatPrice(o.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          {current > 1 && (
            <Link
              href={qs(current - 1)}
              className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-white"
            >
              Précédent
            </Link>
          )}
          <span className="text-slate-500">
            Page {current} sur {pages}
          </span>
          {current < pages && (
            <Link
              href={qs(current + 1)}
              className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-white"
            >
              Suivant
            </Link>
          )}
        </div>
      )}
    </>
  );
}
