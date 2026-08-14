import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import {
  documentTypeLabels,
  isEditable,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";
import { PageTitle } from "@/components/admin/ui";
import DocumentEditor from "../../DocumentEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function iso(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditDocumentPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  // Même contrôle d'offre que la section : sans lui, un signet
  // contournerait le verrou.
  const gate = await featureGate("invoicing");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;
  const { id } = await params;

  const [document, products, customers] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, unit: true, stock: true },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        nif: true,
        rccm: true,
      },
    }),
  ]);

  if (!document) notFound();
  if (!isEditable(document.status as DocumentStatus)) {
    redirect(`/admin/factures/${id}`);
  }

  return (
    <>
      <PageTitle
        title={`${documentTypeLabels[document.type as DocumentType]} ${document.reference}`}
        description="Brouillon — modifiable tant qu'il n'est pas émis"
      />
      <DocumentEditor
        products={products}
        customers={customers}
        values={{
          id: document.id,
          type: document.type as DocumentType,
          customerId: document.customerId,
          clientName: document.clientName,
          clientPhone: document.clientPhone ?? "",
          clientAddress: document.clientAddress ?? "",
          clientNif: document.clientNif ?? "",
          clientRccm: document.clientRccm ?? "",
          issueDate: iso(document.issueDate),
          dueDate: iso(document.dueDate),
          validUntil: iso(document.validUntil),
          vatEnabled: document.vatEnabled,
          vatRate: document.vatRate || 18,
          discount: document.discount,
          note: document.note,
          terms: document.terms,
          deliveryAddress: document.deliveryAddress ?? "",
          lines: document.items.map((item) => ({
            key: item.id,
            productId: item.productId,
            name: item.name,
            description: item.description,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discount: item.discount,
          })),
        }}
      />
    </>
  );
}
