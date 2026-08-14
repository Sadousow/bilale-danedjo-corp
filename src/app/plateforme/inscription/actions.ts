"use server";

import { checkSlug, createTenant, suggestSlug } from "@/lib/provisioning";
import { audit } from "@/lib/platform-auth";
import { notifyNewShop } from "@/lib/messaging/signup-notice";
import {
  callerAddress,
  checkThrottle,
  registerFailure,
  RULES,
} from "@/lib/throttle";
import { createHash } from "node:crypto";

export type SignupState = {
  error?: string;
  /** Adresse de la boutique créée, pour l'écran de confirmation. */
  createdSlug?: string;
};

/** Vérification en direct de la disponibilité de l'adresse. */
export async function checkSlugAction(raw: string) {
  const slug = suggestSlug(raw);
  if (!slug) return { slug: "", available: false, reason: "Adresse vide." };

  const result = await checkSlug(slug);
  return { slug, ...result };
}

/**
 * L'inscription crée une base de données de boutique et un compte
 * administrateur. Laissée libre, elle permettrait de remplir la plateforme de
 * boutiques fantômes en quelques minutes. Cinq créations par heure et par
 * adresse suffisent largement à un usage réel.
 */
async function signupBuckets() {
  const address = await callerAddress();
  return [
    {
      key: `signup:${createHash("sha256").update(address).digest("base64url").slice(0, 24)}`,
      rule: RULES.inscription,
    },
  ];
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const buckets = await signupBuckets();
  const verdict = await checkThrottle(buckets);
  if (verdict.blocked) return { error: verdict.message };

  const name = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "") || name;
  const adminName = String(formData.get("adminName") ?? "");
  const adminEmail = String(formData.get("adminEmail") ?? "");
  const phone = String(formData.get("phone") ?? "");

  // Ici le compteur avance à chaque création, réussie ou non : c'est la
  // création elle-même qu'on limite, pas l'erreur de saisie.
  await registerFailure(buckets);

  const result = await createTenant({
    slug: suggestSlug(rawSlug),
    name,
    adminName,
    adminEmail,
    phone,
    password: String(formData.get("password") ?? ""),
    status: "ESSAI",
  });

  if (!result.ok) return { error: result.error };

  await audit({
    action: "TENANT_CREE",
    tenantId: result.tenantId,
    tenantName: name,
    details: "Inscription en libre-service",
  });

  // La boutique existe : plus rien ici ne doit pouvoir échouer bruyamment.
  await notifyNewShop({
    slug: result.slug,
    shopName: name,
    adminName,
    adminEmail,
    phone,
  });

  // On ne pose pas de session ici : le cookie serait attaché au domaine
  // racine, pas au sous-domaine de la boutique. Le marchand se connecte
  // depuis sa propre adresse.
  return { createdSlug: result.slug };
}
