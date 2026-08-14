import { requireRole } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import CustomerForm from "../CustomerForm";

export default async function NewCustomerPage() {
  await requireRole("GERANT");
  return (
    <>
      <PageTitle title="Nouveau client" description="Créer une fiche client" />
      <CustomerForm />
    </>
  );
}
