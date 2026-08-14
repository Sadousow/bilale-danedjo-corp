"use server";

import { requestPasswordReset } from "@/lib/reset-flow";
import { readResetToken, applyReset } from "@/lib/password-reset";
import type { RequestState, ApplyState } from "@/lib/form-state";

// Rien d'autre que des fonctions asynchrones ne sort d'ici : c'est la règle
// des fichiers « use server ». Les types vivent dans @/lib/form-state.

/** Demande d'un lien, pour le personnel d'une boutique. */
export async function requestStaffResetAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  return requestPasswordReset({
    email: String(formData.get("email") ?? ""),
    scope: "staff",
  });
}

/** Demande d'un lien, pour un client de la boutique. */
export async function requestClientResetAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  return requestPasswordReset({
    email: String(formData.get("email") ?? ""),
    scope: "client",
  });
}

/**
 * Applique le nouveau mot de passe.
 *
 * Le jeton est relu et vérifié ici, jamais transmis par un champ caché de
 * confiance : c'est la base qui dit à quel compte il appartient, pas le
 * formulaire.
 */
export async function applyResetAction(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const token = String(formData.get("jeton") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password !== confirmation) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const record = await readResetToken(token);
  if (!record) {
    return {
      error:
        "Ce lien n'est plus valable — il a expiré, ou il a déjà servi. Demandez-en un nouveau.",
    };
  }

  const result = await applyReset(record, password);
  if (!result.ok) return { error: result.error };

  return { ok: true };
}
