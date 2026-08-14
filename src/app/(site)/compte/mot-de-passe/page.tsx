import type { Metadata } from "next";

import { requireTenant } from "@/lib/tenant";
import { readResetToken } from "@/lib/password-reset";
import {
  AuthCard,
  RequestResetForm,
  ApplyResetForm,
} from "@/components/auth/ResetForms";
import { requestClientResetAction, applyResetAction } from "@/app/mot-de-passe/actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jeton?: string }> };

/** Même écran que pour le personnel, côté clients de la boutique. */
export default async function ClientPasswordPage({ searchParams }: Props) {
  const { jeton } = await searchParams;
  const tenant = await requireTenant();

  if (jeton) {
    const record = await readResetToken(jeton);
    const valid =
      record !== null && record.scope === "client" && record.tenantId === tenant.id;

    if (!valid) {
      return (
        <AuthCard
          icon="key"
          title="Lien expiré"
          subtitle="Ce lien a déjà servi, ou il a plus d'une heure."
        >
          <RequestResetForm
            action={requestClientResetAction}
            backHref="/compte"
            backLabel="Retour à mon compte"
          />
        </AuthCard>
      );
    }

    return (
      <AuthCard icon="key" title="Nouveau mot de passe" subtitle={tenant.name}>
        <ApplyResetForm
          action={applyResetAction}
          token={jeton}
          loginHref="/compte"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Mot de passe oublié" subtitle={tenant.name}>
      <RequestResetForm
        action={requestClientResetAction}
        backHref="/compte"
        backLabel="Retour à mon compte"
      />
    </AuthCard>
  );
}
