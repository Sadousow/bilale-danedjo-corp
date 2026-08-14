import type { Metadata } from "next";

import { requireTenant } from "@/lib/tenant";
import { readResetToken } from "@/lib/password-reset";
import { isEmailConfigured } from "@/lib/messaging/send";
import {
  AuthCard,
  RequestResetForm,
  ApplyResetForm,
} from "@/components/auth/ResetForms";
import { requestStaffResetAction, applyResetAction } from "./actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jeton?: string }> };

/**
 * Écran unique du personnel : sans jeton il demande un lien, avec un jeton
 * valide il propose de choisir un mot de passe.
 */
export default async function StaffPasswordPage({ searchParams }: Props) {
  const { jeton } = await searchParams;
  const tenant = await requireTenant();

  if (jeton) {
    const record = await readResetToken(jeton);

    // On vérifie que le lien appartient bien à cette boutique : un jeton
    // émis ailleurs ne doit rien pouvoir ici.
    const valid =
      record !== null && record.scope === "staff" && record.tenantId === tenant.id;

    if (!valid) {
      return (
        <AuthCard
          icon="key"
          title="Lien expiré"
          subtitle="Ce lien a déjà servi, ou il a plus d'une heure."
        >
          <RequestResetForm action={requestStaffResetAction} />
        </AuthCard>
      );
    }

    return (
      <AuthCard icon="key" title="Nouveau mot de passe" subtitle={tenant.name}>
        <ApplyResetForm action={applyResetAction} token={jeton} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle={`Espace de gestion — ${tenant.name}`}
    >
      {!isEmailConfigured() && (
        <p className="mb-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          L&apos;envoi d&apos;emails n&apos;est pas configuré sur ce serveur.
          Contactez votre administrateur.
        </p>
      )}
      <RequestResetForm action={requestStaffResetAction} />
    </AuthCard>
  );
}
