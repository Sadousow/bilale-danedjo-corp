import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, PackageCheck, XCircle } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { db } from "@/lib/tenant-db";
import { getSettings } from "@/lib/settings";
import { formatPrice, formatDate } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/site";
import {
  displayPhone,
  orderPaymentMethodLabels,
  orderPaymentStatusLabels,
  orderStatusPublic,
  orderTimeline,
  type OrderStatus,
} from "@/lib/orders";
import { getPaymentStatus } from "@/lib/payment/djomy";
import { currentTenantCredentials } from "@/lib/payment/tenant-djomy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre commande",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ transactionId?: string; status?: string; annule?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const prisma = await db();
  const [{ id }, query, settings] = await Promise.all([
    params,
    searchParams,
    getSettings(),
  ]);

  let order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!order) notFound();

  // Retour depuis le portail de paiement : on revérifie auprès du prestataire
  // plutôt que de faire confiance au paramètre d'URL.
  const transactionId = query.transactionId ?? order.paymentReference;
  if (
    order.paymentMethod === "EN_LIGNE" &&
    order.paymentStatus === "EN_ATTENTE" &&
    transactionId
  ) {
    const check = await getPaymentStatus(
      await currentTenantCredentials(),
      transactionId
    );
    if (check.status === "SUCCESS" || check.status === "FAILED") {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentReference: transactionId,
          paymentStatus: check.status === "SUCCESS" ? "PAYEE" : "ECHOUEE",
          paidAmount: check.status === "SUCCESS" ? (check.paidAmount ?? order.total) : 0,
          paidAt: check.status === "SUCCESS" ? new Date() : null,
        },
        include: { items: { orderBy: { position: "asc" } } },
      });
    }
  }

  const status = order.status as OrderStatus;
  const cancelled = status === "ANNULEE";
  const currentStep = orderTimeline.indexOf(status);
  const paymentFailed =
    order.paymentMethod === "EN_LIGNE" && order.paymentStatus === "ECHOUEE";
  const awaitingPayment =
    order.paymentMethod === "EN_LIGNE" && order.paymentStatus === "EN_ATTENTE";

  return (
    <>
      <PageHeader
        eyebrow={`Commande ${order.reference}`}
        title={
          cancelled
            ? "Commande annulée"
            : paymentFailed
              ? "Paiement non abouti"
              : "Merci pour votre commande !"
        }
        description={
          cancelled
            ? "Cette commande a été annulée."
            : paymentFailed
              ? "Le règlement n'a pas pu être finalisé. Nous vous rappelons pour convenir d'un autre mode de paiement."
              : settings.orderConfirmation
        }
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Statut */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-6">
              {cancelled ? (
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              ) : status === "LIVREE" ? (
                <PackageCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : awaitingPayment ? (
                <Clock className="w-6 h-6 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-slate-800">
                  {orderStatusPublic[status]}
                </p>
                <p className="text-sm text-slate-500">
                  Commande passée le {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            {!cancelled && (
              <ol className="grid grid-cols-5 gap-1">
                {orderTimeline.map((step, index) => {
                  const done = currentStep >= index;
                  return (
                    <li key={step} className="text-center">
                      <div
                        className={`h-1.5 rounded-full mb-2 ${
                          done ? "bg-brand-blue" : "bg-slate-200"
                        }`}
                      />
                      <span
                        className={`text-[11px] leading-tight ${
                          done ? "text-brand-blue font-medium" : "text-slate-400"
                        }`}
                      >
                        {
                          {
                            RECUE: "Reçue",
                            CONFIRMEE: "Confirmée",
                            PREPAREE: "Préparée",
                            EXPEDIEE: "En route",
                            LIVREE: "Livrée",
                            ANNULEE: "",
                          }[step]
                        }
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {awaitingPayment && (
            <p className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-900">
              Nous attendons la confirmation de votre paiement. Si vous avez déjà
              validé sur votre téléphone, cette page se mettra à jour dans
              quelques instants — actualisez-la.
            </p>
          )}

          {/* Articles */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-brand-blue">
                Détail de la commande
              </h2>
            </div>

            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatPrice(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="px-6 py-4 bg-slate-50 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Sous-total</dt>
                <dd className="text-slate-800">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">
                  Livraison — {order.zoneName || "à convenir"}
                </dt>
                <dd className="text-slate-800">
                  {order.deliveryFee === 0 ? "Offerte" : formatPrice(order.deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <dt className="font-semibold text-slate-800">Total</dt>
                <dd className="text-lg font-bold text-brand-blue">
                  {formatPrice(order.total)}
                </dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-slate-600">Paiement</dt>
                <dd className="text-slate-800">
                  {orderPaymentMethodLabels[order.paymentMethod]}
                  {order.paymentMethod === "EN_LIGNE" && (
                    <span className="text-slate-500">
                      {" "}
                      — {orderPaymentStatusLabels[order.paymentStatus]}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Livraison */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display font-bold text-brand-blue mb-3">
              Livraison
            </h2>
            <p className="text-sm text-slate-800">{order.clientName}</p>
            <p className="text-sm text-slate-600">
              {displayPhone(order.clientPhone)}
            </p>
            <p className="text-sm text-slate-600">{order.clientAddress}</p>
            {order.clientNotes && (
              <p className="mt-2 text-sm text-slate-500 italic">
                « {order.clientNotes} »
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Sans numéro renseigné, le bouton disparaît : mieux vaut pas
                de bouton qu'un bouton qui ne mène nulle part. */}
            {settings.whatsappNumber && (
              <a
                href={buildWhatsAppLink(
                  settings.whatsappNumber,
                  `Bonjour, je vous contacte au sujet de ma commande ${order.reference}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white font-semibold px-5 py-3 rounded-md transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Nous écrire sur WhatsApp
              </a>
            )}
            <Link
              href="/produits"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-5 py-3 rounded-md transition-colors"
            >
              Continuer mes achats
            </Link>
          </div>

          <p className="text-center text-sm text-slate-500">
            Conservez cette page pour suivre votre commande. Une question ?
            Appelez-nous au {settings.companyPhone}.
          </p>
        </div>
      </section>
    </>
  );
}
