import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { Card, PageTitle, EmptyState, StatCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; dette?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { q, dette } = await searchParams;

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (dette === "1") where.creditBalance = { gt: 0 };

  const [customers, totals] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ creditBalance: "desc" }, { name: "asc" }],
      include: { _count: { select: { sales: true } } },
    }),
    prisma.customer.aggregate({ _sum: { creditBalance: true }, _count: true }),
  ]);

  return (
    <>
      <PageTitle
        title="Clients & crédits"
        description="Fiches clients, historique et suivi des dettes"
        action={
          <Link
            href="/admin/clients/nouveau"
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-4 py-2.5 rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau client
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Clients enregistrés" value={String(totals._count)} />
        <StatCard
          label="Total des crédits en cours"
          value={formatPrice(totals._sum.creditBalance ?? 0)}
          tone={totals._sum.creditBalance ? "danger" : "success"}
        />
      </div>

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom ou téléphone…"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 px-2">
            <input
              type="checkbox"
              name="dette"
              value="1"
              defaultChecked={dette === "1"}
              className="w-4 h-4 accent-brand-blue"
            />
            Uniquement les clients endettés
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700"
          >
            Filtrer
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState>Aucun client enregistré.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Téléphone</th>
                  <th className="text-right font-medium px-4 py-3">Achats</th>
                  <th className="text-right font-medium px-4 py-3">Crédit dû</th>
                  <th className="text-right font-medium px-4 py-3">Plafond</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.address && (
                        <span className="block text-xs text-slate-400">
                          {c.address}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {c._count.sales}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.creditBalance > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatPrice(c.creditBalance)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">À jour</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {c.creditLimit > 0 ? formatPrice(c.creditLimit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
