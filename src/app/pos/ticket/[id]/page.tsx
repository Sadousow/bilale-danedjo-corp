import { notFound } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  formatPrice,
  formatDateTime,
  paymentMethodLabels,
  ticketNumber,
} from "@/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TicketPage({ params }: Props) {
  const prisma = await db();
  await requireSession();
  const { id } = await params;
  const settings = await getSettings();

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { name: true } },
      customer: { select: { name: true, phone: true } },
    },
  });

  if (!sale) notFound();

  return (
    <div className="max-w-sm mx-auto">
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>
      <div className="bg-white border border-slate-200 rounded-lg p-6 print:border-0 print:rounded-none print:p-0 font-mono text-[13px] leading-relaxed text-slate-800">
        <div className="text-center">
          {/* Le logo du marchand, s'il en a un. Sur papier thermique une
              image se dégrade vite : à contrôler sur une vraie imprimante
              avant de compter dessus. Le nom reste affiché dans tous les cas. */}
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt=""
              className="h-12 w-auto object-contain mx-auto mb-2"
            />
          )}
          <p className="font-bold text-sm uppercase">{settings.companyName}</p>
          <p className="text-[11px] text-slate-500">{settings.companyAddress}</p>
          <p className="text-[11px] text-slate-500">{settings.companyPhone}</p>
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="flex justify-between text-[12px]">
          <span>Ticket</span>
          <span className="font-bold">{ticketNumber(sale.number)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Date</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Caissier</span>
          <span>{sale.user.name}</span>
        </div>
        {sale.customer && (
          <div className="flex justify-between text-[12px]">
            <span>Client</span>
            <span>{sale.customer.name}</span>
          </div>
        )}

        <div className="my-3 border-t border-dashed border-slate-300" />

        <table className="w-full text-[12px]">
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1">
                  {item.name}
                  <span className="block text-slate-500">
                    {item.quantity} × {formatPrice(item.unitPrice)}
                  </span>
                </td>
                <td className="py-1 text-right whitespace-nowrap">
                  {formatPrice(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="flex justify-between">
          <span>Sous-total</span>
          <span>{formatPrice(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Remise</span>
            <span>− {formatPrice(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-1">
          <span>TOTAL</span>
          <span>{formatPrice(sale.total)}</span>
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="flex justify-between text-[12px]">
          <span>Paiement</span>
          <span>{paymentMethodLabels[sale.method]}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Reçu</span>
          <span>{formatPrice(sale.paid)}</span>
        </div>
        {sale.change > 0 && (
          <div className="flex justify-between text-[12px]">
            <span>Monnaie</span>
            <span>{formatPrice(sale.change)}</span>
          </div>
        )}
        {sale.due > 0 && (
          <div className="flex justify-between text-[12px] font-bold">
            <span>Reste dû</span>
            <span>{formatPrice(sale.due)}</span>
          </div>
        )}

        <div className="my-3 border-t border-dashed border-slate-300" />

        <p className="text-center text-[11px] text-slate-500">
          Merci de votre confiance !
        </p>
        <p className="text-center text-[11px] text-slate-500">
          {settings.slogan}
        </p>
        {sale.status === "ANNULEE" && (
          <p className="mt-3 text-center font-bold text-red-600">
            *** VENTE ANNULÉE ***
          </p>
        )}
      </div>

      <div className="mt-5 text-center print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
