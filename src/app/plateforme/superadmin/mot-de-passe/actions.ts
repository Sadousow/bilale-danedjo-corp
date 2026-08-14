"use server";

import { requestPasswordReset } from "@/lib/reset-flow";
import type { RequestState } from "@/lib/form-state";

/** Demande d'un lien pour un agent de la plateforme. */
export async function requestPlatformResetAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  return requestPasswordReset({
    email: String(formData.get("email") ?? ""),
    scope: "plateforme",
  });
}
