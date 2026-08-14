import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import { getSettings } from "@/lib/settings";
import { documentTypeLabels, type DocumentType } from "@/lib/documents";
import { PageTitle } from "@/components/admin/ui";
import DocumentEditor from "../DocumentEditor";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ type?: string }> };

function isType(value: string | undefined): value is DocumentType {
  return (
    value === "PROFORMA" || value === "FACTURE" || value === "BON_LIVRAISON"
  );
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function NewDocumentPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  // Même contrôle d'offre que la section : sans lui, un signet
  // contournerait le verrou.
  const gate = await featureGate("invoicing");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;
  const { type: rawType } = await searchParams;
  const type: DocumentType = isType(rawType) ? rawType : "FACTURE";

  const [products, customers, settings] = await Promise.all([
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
    getSettings(),
  ]);

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + settings.proformaValidityDays);

  return (
    <>
      <PageTitle
        title={`Nouveau — ${documentTypeLabels[type].toLowerCase()}`}
        description="Le document est créé en brouillon : il reste modifiable tant qu'il n'est pas émis."
      />
      <DocumentEditor
        products={products}
        customers={customers}
        values={{
          type,
          customerId: null,
          clientName: "",
          clientPhone: "",
          clientAddress: "",
          clientNif: "",
          clientRccm: "",
          issueDate: iso(today),
          dueDate: type === "FACTURE" ? iso(dueDate) : "",
          validUntil: type === "PROFORMA" ? iso(validUntil) : "",
          vatEnabled: type === "BON_LIVRAISON" ? false : settings.vatEnabledByDefault,
          vatRate: settings.defaultVatRate,
          discount: 0,
          note: "",
          terms: type === "BON_LIVRAISON" ? "" : settings.paymentTerms,
          deliveryAddress: "",
          lines: [
            {
              key: "line-initial",
              productId: null,
              name: "",
              description: "",
              unit: null,
              unitPrice: 0,
              quantity: 1,
              discount: 0,
            },
          ],
        }}
      />
    </>
  );
}
