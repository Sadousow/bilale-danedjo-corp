import { notFound } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import CustomerForm from "../../CustomerForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditCustomerPage({ params }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <>
      <PageTitle title={`Modifier — ${customer.name}`} />
      <CustomerForm
        values={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          creditLimit: customer.creditLimit,
          nif: customer.nif,
          rccm: customer.rccm,
        }}
      />
    </>
  );
}
