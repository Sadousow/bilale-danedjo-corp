import type { Metadata } from "next";

import { readResetToken } from "@/lib/password-reset";
import { brand } from "@/lib/brand";
import {
  AuthCard,
  RequestResetForm,
  ApplyResetForm,
} from "@/components/auth/ResetForms";
import { applyResetAction } from "@/app/mot-de-passe/actions";
import { requestPlatformResetAction } from "./actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jeton?: string }> };

/**
 * Comptes de la plateforme. Ces accès ouvrent la console de toutes les
 * boutiques : le lien est donc vérifié comme les autres, et le compteur de
 * tentatives s'applique aussi ici.
 */
export default async function PlatformPasswordPage({ searchParams }: Props) {
  const { jeton } = await searchParams;

  if (jeton) {
    const record = await readResetToken(jeton);
    const valid = record !== null && record.scope === "plateforme";

    if (!valid) {
      return (
        <AuthCard
          icon="key"
          title="Lien expiré"
          subtitle="Ce lien a déjà servi, ou il a plus d'une heure."
        >
          <RequestResetForm
            action={requestPlatformResetAction}
            backHref="/superadmin/connexion"
          />
        </AuthCard>
      );
    }

    return (
      <AuthCard icon="key" title="Nouveau mot de passe" subtitle={brand.name}>
        <ApplyResetForm
          action={applyResetAction}
          token={jeton}
          loginHref="/superadmin/connexion"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Mot de passe oublié" subtitle={`Console ${brand.name}`}>
      <RequestResetForm
        action={requestPlatformResetAction}
        backHref="/superadmin/connexion"
      />
    </AuthCard>
  );
}
