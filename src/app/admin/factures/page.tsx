import Link from "next/link";
import { FileText, Plus, Truck } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import { formatPrice, formatDate } from "@/lib/format";
import {
  balanceDue,
  documentStatusLabels,
  documentStatusTone,
  documentTypeShort,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";
import { Card, PageTitle, EmptyState, Badge, StatCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type Props = {
  searchParams: Promise<{
    type?: string;
    statut?: string;
    q?: string;
    page?: string;
  }>;
};

const types: { key: string; label: string }[] = [
  { key: "", label: "Tous les documents" },
  { key: "PROFORMA", label: "Proformas" },
  { key: "FACTURE", label: "Factures" },
  { key: "BON_LIVRAISON", label: "Bons de livraison" },
];

export default async function DocumentsPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");

  // Offre insuffisante : on explique et on propose, au lieu du 404 qui
  // s'affichait avant et ressemblait à une panne.
  const gate = await featureGate("invoicing");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;

  const { type, statut, q, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);

  const where: Prisma.DocumentWhereInput = {};
  if (type === "PROFORMA" || type === "FACTURE" || type === "BON_LIVRAISON") {
    where.type = type;
  }
  if (statut) where.status = statut as DocumentStatus;
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [documents, total, unpaid, proformaCount] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.document.count({ where }),
    prisma.document.findMany({
      where: {
        type: "FACTURE",
        status: { in: ["EMIS", "PAYE_PARTIEL"] },
      },
      select: { total: true, paidAmount: true },
    }),
    prisma.document.count({
      where: { type: "PROFORMA", status: { in: ["EMIS", "ACCEPTE"] } },
    }),
  ]);

  const outstanding = unpaid.reduce(
    (acc, d) => acc + Math.max(0, d.total - d.paidAmount),
    0
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (statut) params.set("statut", statut);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <>
      <PageTitle
        title="Facturation"
        description="Proformas, factures et bons de livraison"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/factures/nouveau?type=PROFORMA"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white font-medium px-4 py-2.5 rounded-md text-sm"
            >
              <FileText className="w-4 h-4" />
              Proforma
            </Link>
            <Link
              href="/admin/factures/nouveau?type=BON_LIVRAISON"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white font-medium px-4 py-2.5 rounded-md text-sm"
            >
              <Truck className="w-4 h-4" />
              Bon de livraison
            </Link>
            <Link
              href="/admin/factures/nouveau?type=FACTURE"
              className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-4 py-2.5 rounded-md text-sm"
            >
              <Plus className="w-4 h-4" />
              Facture
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Documents" value={String(total)} />
        <StatCard
          label="Factures impayées"
          value={formatPrice(outstanding)}
          tone={outstanding ? "danger" : "success"}
          hint={`${unpaid.length} facture(s) en attente`}
        />
        <StatCard
          label="Proformas en cours"
          value={String(proformaCount)}
          tone="gold"
          hint="Émises ou acceptées"
        />
      </div>

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <select
            name="type"
            defaultValue={type ?? ""}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            name="statut"
            defaultValue={statut ?? ""}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(documentStatusLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Référence ou nom du client…"
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
        {documents.length === 0 ? (
          <EmptyState>Aucun document ne correspond à ces critères.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Référence</th>
                  <th className="text-left font-medium px-4 py-3">Type</th>
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-center font-medium px-4 py-3">Statut</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                  <th className="text-right font-medium px-4 py-3">Reste dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => {
                  const due = balanceDue({
                    type: d.type as DocumentType,
                    status: d.status as DocumentStatus,
                    total: d.total,
                    paidAmount: d.paidAmount,
                  });
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/factures/${d.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {d.reference}
                        </Link>
                        <span className="block text-xs text-slate-400">
                          {d._count.items} ligne(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {documentTypeShort[d.type as DocumentType]}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{d.clientName}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(d.issueDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={documentStatusTone[d.status as DocumentStatus]}>
                          {documentStatusLabels[d.status as DocumentStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatPrice(d.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {due > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatPrice(due)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
