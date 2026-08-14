import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import {
  formatPrice,
  formatDateTime,
  paymentMethodLabels,
  ticketNumber,
} from "@/lib/format";
import { Card, PageTitle, EmptyState, StatCard } from "@/components/admin/ui";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          number: true,
          total: true,
          due: true,
          method: true,
          status: true,
          createdAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  const totalSpent = await prisma.sale.aggregate({
    where: { customerId: id, status: "COMPLETEE" },
    _sum: { total: true },
  });

  return (
    <>
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux clients
      </Link>

      <PageTitle
        title={customer.name}
        description={[customer.phone, customer.address].filter(Boolean).join(" · ")}
        action={
          <Link
            href={`/admin/clients/${customer.id}/modifier`}
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white font-medium px-4 py-2.5 rounded-md text-sm"
          >
            <Pencil className="w-4 h-4" />
            Modifier la fiche
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Crédit en cours"
          value={formatPrice(customer.creditBalance)}
          tone={customer.creditBalance > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Total des achats"
          value={formatPrice(totalSpent._sum.total ?? 0)}
        />
        <StatCard
          label="Plafond de crédit"
          value={customer.creditLimit > 0 ? formatPrice(customer.creditLimit) : "Aucun"}
          tone="gold"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Historique d&apos;achats</h2>
            </div>
            {customer.sales.length === 0 ? (
              <EmptyState>Aucun achat enregistré.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Ticket</th>
                    <th className="text-left font-medium px-5 py-2.5">Date</th>
                    <th className="text-right font-medium px-5 py-2.5">Total</th>
                    <th className="text-right font-medium px-5 py-2.5">Reste dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/ventes/${s.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {ticketNumber(s.number)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">
                        {formatPrice(s.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
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
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Règlements de crédit</h2>
            </div>
            {customer.payments.length === 0 ? (
              <EmptyState>Aucun règlement enregistré.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {customer.payments.map((p) => (
                  <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-800 font-medium">
                        {formatPrice(p.amount)}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {paymentMethodLabels[p.method]}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(p.createdAt)} — {p.user.name}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {customer.creditBalance > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Encaisser un remboursement
              </h2>
              <PaymentForm
                customerId={customer.id}
                balance={customer.creditBalance}
              />
            </Card>
          )}

          {customer.notes && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-2">Notes</h2>
              <p className="text-sm text-slate-600 whitespace-pre-line">
                {customer.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
