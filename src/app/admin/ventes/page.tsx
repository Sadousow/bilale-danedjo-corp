import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import {
  formatPrice,
  formatDateTime,
  paymentMethodLabels,
  ticketNumber,
} from "@/lib/format";
import { Card, PageTitle, EmptyState, Badge, StatCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type Props = {
  searchParams: Promise<{ du?: string; au?: string; page?: string; q?: string }>;
};

export default async function SalesPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { du, au, page, q } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);

  const where: Prisma.SaleWhereInput = {};
  if (du || au) {
    where.createdAt = {};
    if (du) where.createdAt.gte = new Date(`${du}T00:00:00`);
    if (au) where.createdAt.lte = new Date(`${au}T23:59:59`);
  }
  if (q) {
    const asNumber = Number(q);
    where.OR = [
      ...(Number.isFinite(asNumber) && q.trim() !== "" ? [{ number: asNumber }] : []),
      { customer: { name: { contains: q, mode: "insensitive" as const } } },
    ];
  }

  const [sales, total, agg] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true } },
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: { ...where, status: "COMPLETEE" },
      _sum: { total: true, due: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (du) params.set("du", du);
    if (au) params.set("au", au);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <>
      <PageTitle title="Ventes" description={`${total} vente(s) sur la période`} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total encaissé" value={formatPrice(agg._sum.total ?? 0)} />
        <StatCard
          label="Reste à recouvrer"
          value={formatPrice(agg._sum.due ?? 0)}
          tone={agg._sum.due ? "danger" : "success"}
        />
        <StatCard label="Nombre de tickets" value={String(total)} tone="gold" />
      </div>

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label htmlFor="du" className="block text-xs text-slate-500 mb-1">
              Du
            </label>
            <input
              id="du"
              name="du"
              type="date"
              defaultValue={du ?? ""}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label htmlFor="au" className="block text-xs text-slate-500 mb-1">
              Au
            </label>
            <input
              id="au"
              name="au"
              type="date"
              defaultValue={au ?? ""}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="N° de ticket ou nom du client…"
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
        {sales.length === 0 ? (
          <EmptyState>Aucune vente sur cette période.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Ticket</th>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Caissier</th>
                  <th className="text-left font-medium px-4 py-3">Paiement</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                  <th className="text-right font-medium px-4 py-3">Reste dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/ventes/${s.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {ticketNumber(s.number)}
                      </Link>
                      <span className="block text-xs text-slate-400">
                        {s._count.items} article(s)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.customer?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.user.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.method === "CREDIT" ? "gold" : "slate"}>
                        {paymentMethodLabels[s.method]}
                      </Badge>
                      {s.status === "ANNULEE" && (
                        <Badge tone="red">Annulée</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatPrice(s.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.due > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatPrice(s.due)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
