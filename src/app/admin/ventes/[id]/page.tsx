import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, FileText, Printer } from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import {
  formatPrice,
  formatDateTime,
  paymentMethodLabels,
  ticketNumber,
} from "@/lib/format";
import { Card, PageTitle, Badge } from "@/components/admin/ui";
import { cancelSaleAction } from "../actions";
import { invoiceFromSaleAction } from "../../factures/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SaleDetailPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!sale) notFound();

  const margin = sale.items.reduce(
    (acc, i) => acc + (i.unitPrice - i.cost) * i.quantity,
    0
  );

  return (
    <>
      <Link
        href="/admin/ventes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux ventes
      </Link>

      <PageTitle
        title={`Ticket ${ticketNumber(sale.number)}`}
        description={`${formatDateTime(sale.createdAt)} — encaissé par ${sale.user.name}`}
        action={
          sale.status === "COMPLETEE" ? (
            <div className="flex flex-wrap gap-2">
              <form action={invoiceFromSaleAction}>
                <input type="hidden" name="saleId" value={sale.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-medium px-4 py-2.5 rounded-md text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Établir la facture
                </button>
              </form>
              <form action={cancelSaleAction}>
                <input type="hidden" name="id" value={sale.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium px-4 py-2.5 rounded-md text-sm"
                >
                  <Ban className="w-4 h-4" />
                  Annuler la vente
                </button>
              </form>
            </div>
          ) : (
            <Badge tone="red">Vente annulée</Badge>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Articles</h2>
            <Link
              href={`/pos/ticket/${sale.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
            >
              <Printer className="w-3.5 h-3.5" />
              Voir le reçu
            </Link>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Article</th>
                <th className="text-right font-medium px-5 py-2.5">P.U.</th>
                <th className="text-right font-medium px-5 py-2.5">Qté</th>
                <th className="text-right font-medium px-5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-slate-800">{item.name}</td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {formatPrice(item.unitPrice)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">
                    {formatPrice(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-5 py-2.5 text-right text-slate-500">
                  Sous-total
                </td>
                <td className="px-5 py-2.5 text-right text-slate-700">
                  {formatPrice(sale.subtotal)}
                </td>
              </tr>
              {sale.discount > 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-right text-slate-500">
                    Remise
                  </td>
                  <td className="px-5 py-2.5 text-right text-amber-700">
                    − {formatPrice(sale.discount)}
                  </td>
                </tr>
              )}
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-3 text-right font-semibold text-slate-800"
                >
                  Total
                </td>
                <td className="px-5 py-3 text-right text-lg font-bold text-brand-blue">
                  {formatPrice(sale.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Règlement</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Mode</dt>
                <dd className="font-medium text-slate-800">
                  {paymentMethodLabels[sale.method]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Montant reçu</dt>
                <dd className="font-medium text-slate-800">{formatPrice(sale.paid)}</dd>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Monnaie rendue</dt>
                  <dd className="font-medium text-slate-800">
                    {formatPrice(sale.change)}
                  </dd>
                </div>
              )}
              {sale.due > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Reste dû</dt>
                  <dd className="font-semibold text-red-600">
                    {formatPrice(sale.due)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-2.5 border-t border-slate-100">
                <dt className="text-slate-500">Marge estimée</dt>
                <dd className="font-medium text-emerald-600">{formatPrice(margin)}</dd>
              </div>
            </dl>
          </Card>

          {sale.customer && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Client</h2>
              <Link
                href={`/admin/clients/${sale.customer.id}`}
                className="text-brand-blue hover:underline font-medium"
              >
                {sale.customer.name}
              </Link>
              {sale.customer.phone && (
                <p className="text-sm text-slate-500 mt-1">{sale.customer.phone}</p>
              )}
            </Card>
          )}

          {sale.note && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-2">Note</h2>
              <p className="text-sm text-slate-600">{sale.note}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
