import { formatDate, formatPrice } from "@/lib/format";
import { markInvoicePaidAction } from "../../abonnements/actions";

const invoiceStatusStyles: Record<string, string> = {
  EN_ATTENTE: "bg-amber-50 text-amber-700",
  PAYEE: "bg-emerald-50 text-emerald-700",
  ECHOUEE: "bg-red-50 text-red-700",
  ANNULEE: "bg-slate-100 text-slate-500",
};

const invoiceStatusLabels: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PAYEE: "Payée",
  ECHOUEE: "Échouée",
  ANNULEE: "Annulée",
};

export type InvoiceView = {
  id: string;
  reference: string;
  planName: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  paidAt: Date | null;
};

export default function InvoiceRow({ invoice }: { invoice: InvoiceView }) {
  const settleable =
    invoice.status === "EN_ATTENTE" || invoice.status === "ECHOUEE";

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-5 py-2.5">
        <p className="font-medium text-slate-800">{invoice.reference}</p>
        <p className="text-xs text-slate-400">{invoice.planName}</p>
      </td>
      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
        {formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}
      </td>
      <td className="px-5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
        {formatPrice(invoice.amount)}
      </td>
      <td className="px-5 py-2.5 text-center whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusStyles[invoice.status]}`}
        >
          {invoiceStatusLabels[invoice.status]}
        </span>
        {invoice.paidAt && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            {formatDate(invoice.paidAt)}
          </p>
        )}
      </td>
      <td className="px-5 py-2.5 text-right">
        {settleable && (
          <form action={markInvoicePaidAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button
              type="submit"
              className="text-xs text-brand-blue hover:underline"
              title="Règlement hors ligne : virement, espèces, Mobile Money"
            >
              Marquer payée
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
