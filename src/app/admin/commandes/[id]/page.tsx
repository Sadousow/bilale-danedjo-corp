import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, FileText, Phone } from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import { formatPrice, formatDateTime } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/site";
import {
  allowedOrderTransitions,
  displayPhone,
  orderPaymentMethodLabels,
  orderPaymentStatusLabels,
  orderStatusLabels,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders";
import { Card, PageTitle, Badge, EmptyState } from "@/components/admin/ui";
import {
  changeOrderStatusAction,
  invoiceFromOrderAction,
  markOrderPaidAction,
} from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const transitionLabels: Partial<Record<OrderStatus, string>> = {
  CONFIRMEE: "Confirmer",
  PREPAREE: "Marquer préparée",
  EXPEDIEE: "Partir en livraison",
  LIVREE: "Confirmer la livraison",
  ANNULEE: "Annuler",
};

export default async function OrderDetailPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  // Même contrôle d'offre que la section : sans lui, un signet
  // contournerait le verrou.
  const gate = await featureGate("shop");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      customer: { select: { id: true, name: true } },
      documents: {
        select: { id: true, reference: true, type: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  const status = order.status as OrderStatus;
  const transitions = allowedOrderTransitions(status);

  return (
    <>
      <Link
        href="/admin/commandes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux commandes
      </Link>

      <PageTitle
        title={`Commande ${order.reference}`}
        description={`Passée le ${formatDateTime(order.createdAt)}`}
        action={
          order.status !== "ANNULEE" ? (
            <form action={invoiceFromOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-medium px-4 py-2.5 rounded-md text-sm"
              >
                <FileText className="w-4 h-4" />
                Établir la facture
              </button>
            </form>
          ) : null
        }
      />

      <Card className="p-4 mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={orderStatusTone[status]}>{orderStatusLabels[status]}</Badge>
        <Badge
          tone={
            order.paymentStatus === "PAYEE"
              ? "green"
              : order.paymentStatus === "ECHOUEE"
                ? "red"
                : "gold"
          }
        >
          {orderPaymentMethodLabels[order.paymentMethod]} —{" "}
          {orderPaymentStatusLabels[order.paymentStatus]}
        </Badge>

        <div className="flex-1" />

        {order.paymentStatus !== "PAYEE" && order.status !== "ANNULEE" && (
          <form action={markOrderPaidAction}>
            <input type="hidden" name="id" value={order.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-md text-sm font-medium"
            >
              <BadgeCheck className="w-4 h-4" />
              Marquer payée
            </button>
          </form>
        )}

        {transitions.map((target) => (
          <form key={target} action={changeOrderStatusAction}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={target} />
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                target === "ANNULEE"
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : target === "LIVREE"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-brand-blue text-white hover:bg-brand-blue-light"
              }`}
            >
              {transitionLabels[target] ?? orderStatusLabels[target]}
            </button>
          </form>
        ))}
      </Card>

      {status === "EXPEDIEE" && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Confirmer la livraison décrémentera le stock des articles ci-dessous
          {order.paymentMethod === "A_LA_LIVRAISON" &&
            " et marquera la commande comme payée"}
          .
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Articles</h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Article</th>
                <th className="text-right font-medium px-3 py-2.5">P.U.</th>
                <th className="text-right font-medium px-3 py-2.5">Qté</th>
                <th className="text-right font-medium px-5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-slate-800">{item.name}</td>
                  <td className="px-3 py-3 text-right text-slate-500">
                    {formatPrice(item.unitPrice)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {item.quantity}
                    {item.unit && (
                      <span className="text-xs text-slate-400"> {item.unit}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">
                    {formatPrice(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                  Sous-total
                </td>
                <td className="px-5 py-2 text-right text-slate-700">
                  {formatPrice(order.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                  Livraison — {order.zoneName}
                </td>
                <td className="px-5 py-2 text-right text-slate-700">
                  {order.deliveryFee === 0
                    ? "Offerte"
                    : formatPrice(order.deliveryFee)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-3 text-right font-semibold text-slate-800"
                >
                  Total
                </td>
                <td className="px-5 py-3 text-right text-lg font-bold text-brand-blue">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Livraison</h2>
            <p className="font-medium text-slate-800">{order.clientName}</p>
            <p className="text-sm text-slate-500">
              {displayPhone(order.clientPhone)}
            </p>
            {order.clientEmail && (
              <p className="text-sm text-slate-500">{order.clientEmail}</p>
            )}
            <p className="mt-2 text-sm text-slate-700">{order.clientAddress}</p>
            {order.clientNotes && (
              <p className="mt-2 text-sm text-slate-500 italic">
                « {order.clientNotes} »
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`tel:+${order.clientPhone.replace(/^00/, "")}`}
                className="inline-flex items-center gap-2 text-sm text-brand-blue hover:underline"
              >
                <Phone className="w-4 h-4" />
                Appeler le client
              </a>
              {/* Le message part vers le CLIENT. Auparavant ce lien
                  utilisait le numéro de la boutique : le marchand ouvrait une
                  conversation avec lui-même. */}
              {buildWhatsAppLink(order.clientPhone, "") && (
                <a
                  href={buildWhatsAppLink(
                    order.clientPhone,
                    `Bonjour ${order.clientName}, au sujet de votre commande ${order.reference}…`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-blue hover:underline"
                >
                  Écrire sur WhatsApp →
                </a>
              )}
              {order.customer && (
                <Link
                  href={`/admin/clients/${order.customer.id}`}
                  className="text-sm text-brand-blue hover:underline"
                >
                  Voir la fiche client →
                </Link>
              )}
            </div>
          </Card>

          {order.paymentMethod === "EN_LIGNE" && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-3">
                Paiement en ligne
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Statut</dt>
                  <dd className="text-slate-800">
                    {orderPaymentStatusLabels[order.paymentStatus]}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Montant reçu</dt>
                  <dd className="text-slate-800">
                    {formatPrice(order.paidAmount)}
                  </dd>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Réglée le</dt>
                    <dd className="text-slate-800">
                      {formatDateTime(order.paidAt)}
                    </dd>
                  </div>
                )}
                {order.paymentReference && (
                  <div>
                    <dt className="text-slate-500">Transaction</dt>
                    <dd className="text-xs text-slate-600 break-all">
                      {order.paymentReference}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Documents liés</h2>
            {order.documents.length === 0 ? (
              <EmptyState>Aucune facture établie.</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.documents.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/admin/factures/${doc.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      {doc.reference}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
