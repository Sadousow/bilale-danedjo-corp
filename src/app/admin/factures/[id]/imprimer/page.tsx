import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { requireFeature } from "@/lib/subscription";
import { getSettings } from "@/lib/settings";
import { formatPrice, formatDate } from "@/lib/format";
import {
  amountInWords,
  balanceDue,
  documentTypeLabels,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";
import PrintButton from "@/app/pos/ticket/[id]/PrintButton";
import { buildTheme, themeStyle } from "@/lib/theme";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PrintDocumentPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  // Sous-page atteignable par adresse directe : même contrôle d'offre
  // que la section, sinon un signet contournerait le verrou.
  await requireFeature("invoicing");
  const { id } = await params;

  const [doc, settings] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    getSettings(),
  ]);

  if (!doc) notFound();

  const type = doc.type as DocumentType;
  const status = doc.status as DocumentStatus;
  const isDelivery = type === "BON_LIVRAISON";
  const remaining = balanceDue({
    type,
    status,
    total: doc.total,
    paidAmount: doc.paidAmount,
  });

  const hasBank =
    Boolean(settings.bankName || settings.bankAccount || settings.bankIban);

  return (
    <div className="max-w-[210mm] mx-auto">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>

      {/*
        Un document imprimé engage le MARCHAND : il doit porter ses couleurs,
        pas celles de la plateforme. Cette page vit sous /admin, qui n'injecte
        pas le thème de la boutique — sans cette ligne, une facture sortait
        aux couleurs de Guÿgou.
      */}
      <style>{themeStyle(buildTheme(settings.primaryColor, settings.accentColor))}</style>

      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href={`/admin/factures/${doc.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au document
        </Link>
        <PrintButton />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-0 print:rounded-none print:p-0 text-[12px] text-slate-800 leading-relaxed">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-8 pb-5 border-b-2 border-brand-blue">
          <div>
            {/* Une facture engage le marchand, pas la plateforme : son logo,
                ou rien. Le logo d'un autre commerçant en tête d'une facture
                serait au mieux ridicule, au pire un problème juridique. */}
            {settings.logoUrl && (
              <Image
                src={settings.logoUrl}
                alt={settings.companyName}
                width={200}
                height={64}
                className="h-12 w-auto object-contain mb-3"
              />
            )}
            <p className="font-bold text-[13px] text-brand-blue">
              {settings.companyName}
            </p>
            <p className="text-slate-600">{settings.companyAddress}</p>
            {settings.companyPhone && (
              <p className="text-slate-600">Tél. {settings.companyPhone}</p>
            )}
            {settings.companyEmail && (
              <p className="text-slate-600">{settings.companyEmail}</p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              {settings.nif && <>NIF : {settings.nif}</>}
              {settings.nif && settings.rccm && " · "}
              {settings.rccm && <>RCCM : {settings.rccm}</>}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="font-display text-xl font-bold text-brand-blue uppercase">
              {documentTypeLabels[type]}
            </p>
            <p className="mt-1 font-bold text-[14px]">{doc.reference}</p>
            <p className="mt-2 text-slate-600">
              Date : {formatDate(doc.issueDate)}
            </p>
            {doc.dueDate && (
              <p className="text-slate-600">
                Échéance : {formatDate(doc.dueDate)}
              </p>
            )}
            {doc.validUntil && (
              <p className="text-slate-600">
                Valable jusqu&apos;au {formatDate(doc.validUntil)}
              </p>
            )}
            {status === "ANNULE" && (
              <p className="mt-2 font-bold text-red-600">DOCUMENT ANNULÉ</p>
            )}
            {status === "BROUILLON" && (
              <p className="mt-2 font-bold text-amber-600">BROUILLON</p>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="grid grid-cols-2 gap-8 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              {isDelivery ? "Livré à" : "Facturé à"}
            </p>
            <p className="font-bold text-[13px]">{doc.clientName}</p>
            {doc.clientAddress && (
              <p className="text-slate-600">{doc.clientAddress}</p>
            )}
            {doc.clientPhone && <p className="text-slate-600">{doc.clientPhone}</p>}
            {(doc.clientNif || doc.clientRccm) && (
              <p className="mt-1 text-[11px] text-slate-500">
                {doc.clientNif && <>NIF : {doc.clientNif}</>}
                {doc.clientNif && doc.clientRccm && " · "}
                {doc.clientRccm && <>RCCM : {doc.clientRccm}</>}
              </p>
            )}
          </div>

          {isDelivery && doc.deliveryAddress && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                Lieu de livraison
              </p>
              <p className="text-slate-700">{doc.deliveryAddress}</p>
              {doc.deliveredAt && (
                <p className="mt-1 text-slate-600">
                  Livré le {formatDate(doc.deliveredAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lignes */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-brand-blue text-white text-[10px] uppercase">
              <th className="text-left font-semibold px-2.5 py-2">Désignation</th>
              <th className="text-center font-semibold px-2 py-2 w-16">Unité</th>
              <th className="text-right font-semibold px-2 py-2 w-16">Qté</th>
              {!isDelivery && (
                <>
                  <th className="text-right font-semibold px-2 py-2 w-28">
                    P.U. HT
                  </th>
                  <th className="text-right font-semibold px-2.5 py-2 w-32">
                    Montant HT
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 1 ? "bg-slate-50" : undefined}
              >
                <td className="px-2.5 py-2 border-b border-slate-200 align-top">
                  {item.name}
                  {item.description && (
                    <span className="block text-[10px] text-slate-500">
                      {item.description}
                    </span>
                  )}
                  {item.discount > 0 && (
                    <span className="block text-[10px] text-amber-700">
                      Remise : {formatPrice(item.discount)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 border-b border-slate-200 text-center text-slate-600">
                  {item.unit ?? "—"}
                </td>
                <td className="px-2 py-2 border-b border-slate-200 text-right">
                  {item.quantity}
                </td>
                {!isDelivery && (
                  <>
                    <td className="px-2 py-2 border-b border-slate-200 text-right">
                      {formatPrice(item.unitPrice)}
                    </td>
                    <td className="px-2.5 py-2 border-b border-slate-200 text-right font-semibold">
                      {formatPrice(item.lineTotal)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        {!isDelivery && (
          <div className="flex justify-end mt-4">
            <table className="w-[300px]">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-600">Total HT</td>
                  <td className="py-1 text-right">{formatPrice(doc.subtotal)}</td>
                </tr>
                {doc.discount > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">Remise</td>
                    <td className="py-1 text-right">
                      − {formatPrice(doc.discount)}
                    </td>
                  </tr>
                )}
                {doc.vatEnabled ? (
                  <>
                    <tr>
                      <td className="py-1 text-slate-600">Base imposable</td>
                      <td className="py-1 text-right">
                        {formatPrice(doc.taxableBase)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">
                        TVA {doc.vatRate} %
                      </td>
                      <td className="py-1 text-right">
                        {formatPrice(doc.vatAmount)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="py-1 text-[10px] text-slate-500">
                      Exonéré de TVA
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-brand-blue">
                  <td className="py-2 font-bold text-brand-blue">
                    Total {doc.vatEnabled ? "TTC" : "net"}
                  </td>
                  <td className="py-2 text-right font-bold text-[15px] text-brand-blue">
                    {formatPrice(doc.total)}
                  </td>
                </tr>
                {doc.paidAmount > 0 && (
                  <>
                    <tr>
                      <td className="py-1 text-slate-600">Déjà réglé</td>
                      <td className="py-1 text-right">
                        {formatPrice(doc.paidAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold">Reste dû</td>
                      <td className="py-1 text-right font-semibold">
                        {formatPrice(remaining)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isDelivery && (
          <p className="mt-4 text-[11px] italic text-slate-600">
            Arrêté{type === "PROFORMA" ? "e" : "e"} la présente{" "}
            {type === "PROFORMA" ? "proforma" : "facture"} à la somme de{" "}
            <span className="font-semibold not-italic">
              {amountInWords(doc.total)}
            </span>
            .
          </p>
        )}

        {/* Conditions et banque */}
        <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t border-slate-200">
          <div className="space-y-3">
            {doc.terms && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Conditions de paiement
                </p>
                <p className="text-slate-700">{doc.terms}</p>
              </div>
            )}

            {hasBank && !isDelivery && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Coordonnées bancaires
                </p>
                {settings.bankName && (
                  <p className="text-slate-700">{settings.bankName}</p>
                )}
                {settings.bankAccount && (
                  <p className="text-slate-700">
                    Compte : {settings.bankAccount}
                  </p>
                )}
                {settings.bankIban && (
                  <p className="text-slate-700">IBAN : {settings.bankIban}</p>
                )}
                {settings.bankSwift && (
                  <p className="text-slate-700">SWIFT : {settings.bankSwift}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            {isDelivery && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Signature du client
                </p>
                <div className="mt-1 h-20 border border-dashed border-slate-300 rounded" />
                <p className="mt-1 text-[9px] text-slate-400">
                  Précédée de la mention « reçu conforme »
                </p>
              </div>
            )}
            <div className={isDelivery ? "" : "col-span-2"}>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                {settings.signatureLabel}
              </p>
              <div className="mt-1 h-20 border border-dashed border-slate-300 rounded" />
            </div>
          </div>
        </div>

        {settings.documentFooter && (
          <p className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 whitespace-pre-line">
            {settings.documentFooter}
          </p>
        )}
      </div>
    </div>
  );
}
