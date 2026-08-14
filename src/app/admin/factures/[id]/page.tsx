import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Pencil,
  Printer,
  Trash2,
  Truck,
} from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import {
  formatPrice,
  formatDate,
  formatDateTime,
  paymentMethodLabels,
} from "@/lib/format";
import {
  allowedTransitions,
  balanceDue,
  documentStatusLabels,
  documentStatusTone,
  documentTypeLabels,
  isEditable,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";
import { Card, PageTitle, Badge, EmptyState } from "@/components/admin/ui";
import DocumentPaymentForm from "./DocumentPaymentForm";
import {
  changeStatusAction,
  convertToInvoiceAction,
  createDeliveryNoteAction,
  deleteDraftAction,
} from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const transitionLabels: Partial<Record<DocumentStatus, string>> = {
  EMIS: "Émettre",
  ACCEPTE: "Marquer acceptée",
  REFUSE: "Marquer refusée",
  LIVRE: "Confirmer la livraison",
  ANNULE: "Annuler",
};

export default async function DocumentDetailPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  // Même contrôle d'offre que la section : sans lui, un signet
  // contournerait le verrou.
  const gate = await featureGate("invoicing");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      user: { select: { name: true } },
      parent: { select: { id: true, reference: true, type: true } },
      children: {
        select: { id: true, reference: true, type: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      customer: { select: { id: true, name: true } },
      sale: { select: { id: true, number: true } },
    },
  });

  if (!doc) notFound();

  const type = doc.type as DocumentType;
  const status = doc.status as DocumentStatus;
  const editable = isEditable(status);
  const transitions = allowedTransitions(type, status);
  const remaining = balanceDue({
    type,
    status,
    total: doc.total,
    paidAmount: doc.paidAmount,
  });

  const canConvert =
    type === "PROFORMA" && !["ANNULE", "CONVERTI"].includes(status);
  const canDeliver = type !== "BON_LIVRAISON" && status !== "ANNULE";

  return (
    <>
      <Link
        href="/admin/factures"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la facturation
      </Link>

      <PageTitle
        title={`${documentTypeLabels[type]} ${doc.reference}`}
        description={`Émis le ${formatDate(doc.issueDate)} par ${doc.user.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/factures/${doc.id}/imprimer`}
              target="_blank"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white font-medium px-4 py-2.5 rounded-md text-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </Link>
            {editable && (
              <Link
                href={`/admin/factures/${doc.id}/modifier`}
                className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white font-medium px-4 py-2.5 rounded-md text-sm"
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </Link>
            )}
          </div>
        }
      />

      {/* Barre d'actions */}
      <Card className="p-4 mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={documentStatusTone[status]}>
          {documentStatusLabels[status]}
        </Badge>

        <div className="flex-1" />

        {transitions.map((target) => (
          <form key={target} action={changeStatusAction}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="status" value={target} />
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                target === "ANNULE"
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : target === "LIVRE"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-brand-blue text-white hover:bg-brand-blue-light"
              }`}
            >
              {transitionLabels[target] ?? documentStatusLabels[target]}
            </button>
          </form>
        ))}

        {canConvert && (
          <form action={convertToInvoiceAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-2 rounded-md text-sm font-semibold"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Convertir en facture
            </button>
          </form>
        )}

        {canDeliver && (
          <form action={createDeliveryNoteAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium"
            >
              <Truck className="w-4 h-4" />
              Générer un bon de livraison
            </button>
          </form>
        )}

        {editable && (
          <form action={deleteDraftAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-red-600 px-2 py-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </form>
        )}
      </Card>

      {type === "BON_LIVRAISON" && status === "EMIS" && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Confirmer la livraison décrémentera le stock des articles listés
          ci-dessous.
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Lignes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-5 py-2.5">Désignation</th>
                  <th className="text-right font-medium px-3 py-2.5">Qté</th>
                  {type !== "BON_LIVRAISON" && (
                    <>
                      <th className="text-right font-medium px-3 py-2.5">P.U. HT</th>
                      <th className="text-right font-medium px-5 py-2.5">Total HT</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doc.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-slate-800">
                      {item.name}
                      {item.description && (
                        <span className="block text-xs text-slate-400">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {item.quantity}
                      {item.unit && (
                        <span className="text-xs text-slate-400"> {item.unit}</span>
                      )}
                    </td>
                    {type !== "BON_LIVRAISON" && (
                      <>
                        <td className="px-3 py-3 text-right text-slate-500">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          {formatPrice(item.lineTotal)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>

              {type !== "BON_LIVRAISON" && (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                      Sous-total HT
                    </td>
                    <td className="px-5 py-2 text-right text-slate-700">
                      {formatPrice(doc.subtotal)}
                    </td>
                  </tr>
                  {doc.discount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                        Remise
                      </td>
                      <td className="px-5 py-2 text-right text-amber-700">
                        − {formatPrice(doc.discount)}
                      </td>
                    </tr>
                  )}
                  {doc.vatEnabled && (
                    <>
                      <tr>
                        <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                          Base imposable
                        </td>
                        <td className="px-5 py-2 text-right text-slate-700">
                          {formatPrice(doc.taxableBase)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-5 py-2 text-right text-slate-500">
                          TVA {doc.vatRate} %
                        </td>
                        <td className="px-5 py-2 text-right text-slate-700">
                          {formatPrice(doc.vatAmount)}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-3 text-right font-semibold text-slate-800"
                    >
                      Total {doc.vatEnabled ? "TTC" : "net"}
                    </td>
                    <td className="px-5 py-3 text-right text-lg font-bold text-brand-blue">
                      {formatPrice(doc.total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Client</h2>
            <p className="font-medium text-slate-800">{doc.clientName}</p>
            {doc.clientPhone && (
              <p className="text-sm text-slate-500">{doc.clientPhone}</p>
            )}
            {doc.clientAddress && (
              <p className="text-sm text-slate-500">{doc.clientAddress}</p>
            )}
            {(doc.clientNif || doc.clientRccm) && (
              <p className="mt-2 text-xs text-slate-400">
                {doc.clientNif && `NIF : ${doc.clientNif}`}
                {doc.clientNif && doc.clientRccm && " · "}
                {doc.clientRccm && `RCCM : ${doc.clientRccm}`}
              </p>
            )}
            {doc.customer && (
              <Link
                href={`/admin/clients/${doc.customer.id}`}
                className="mt-3 inline-block text-sm text-brand-blue hover:underline"
              >
                Voir la fiche client →
              </Link>
            )}
          </Card>

          {type === "FACTURE" && status !== "ANNULE" && !editable && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Règlement</h2>
              <dl className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total</dt>
                  <dd className="font-medium text-slate-800">
                    {formatPrice(doc.total)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Déjà réglé</dt>
                  <dd className="font-medium text-emerald-600">
                    {formatPrice(doc.paidAmount)}
                  </dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <dt className="text-slate-500">Reste dû</dt>
                  <dd
                    className={`font-bold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {formatPrice(remaining)}
                  </dd>
                </div>
                {doc.dueDate && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Échéance</dt>
                    <dd className="text-slate-700">{formatDate(doc.dueDate)}</dd>
                  </div>
                )}
              </dl>

              {remaining > 0 && (
                <DocumentPaymentForm documentId={doc.id} remaining={remaining} />
              )}

              {doc.payments.length > 0 && (
                <ul className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  {doc.payments.map((p) => (
                    <li key={p.id} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {formatPrice(p.amount)}
                      </span>{" "}
                      — {paymentMethodLabels[p.method]} ·{" "}
                      {formatDateTime(p.createdAt)} · {p.user.name}
                      {p.note && ` · ${p.note}`}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {type === "BON_LIVRAISON" && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Livraison</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">Lieu</dt>
                  <dd className="text-slate-800">
                    {doc.deliveryAddress ?? doc.clientAddress ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Date de livraison</dt>
                  <dd className="text-slate-800">
                    {doc.deliveredAt ? formatDate(doc.deliveredAt) : "Non livré"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Stock décrémenté</dt>
                  <dd className="text-slate-800">
                    {doc.stockApplied ? "Oui" : "Non"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Documents liés</h2>
            {!doc.parent && doc.children.length === 0 && !doc.sale ? (
              <EmptyState>Aucun document lié.</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {doc.parent && (
                  <li>
                    <span className="text-slate-400 text-xs block">
                      Établi à partir de
                    </span>
                    <Link
                      href={`/admin/factures/${doc.parent.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      {doc.parent.reference}
                    </Link>
                  </li>
                )}
                {doc.children.map((child) => (
                  <li key={child.id}>
                    <span className="text-slate-400 text-xs block">
                      {documentTypeLabels[child.type as DocumentType]}
                    </span>
                    <Link
                      href={`/admin/factures/${child.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      {child.reference}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">
                      {documentStatusLabels[child.status as DocumentStatus]}
                    </span>
                  </li>
                ))}
                {doc.sale && (
                  <li>
                    <span className="text-slate-400 text-xs block">
                      Vente en caisse
                    </span>
                    <Link
                      href={`/admin/ventes/${doc.sale.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      Ticket n°{doc.sale.number}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </Card>

          {doc.note && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-2">Note</h2>
              <p className="text-sm text-slate-600 whitespace-pre-line">
                {doc.note}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
