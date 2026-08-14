"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { shopLogin, shopLogout, shopRegister } from "@/lib/shop-auth";

export type AccountState = {
  error?: string;
  /**
   * Message d'information, à ne pas afficher en rouge. Sert au cas où un
   * compte existait déjà à cette adresse : ce n'est pas un échec de saisie,
   * c'est un lien de récupération qui vient de partir.
   */
  notice?: string;
};

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/compte";
}

export async function loginCustomerAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!identifier || !password) {
    return { error: "Renseignez votre email ou téléphone et votre mot de passe." };
  }

  const result = await shopLogin(identifier, password);
  if (!result.ok) return { error: result.error };

  revalidatePath("/compte");
  redirect(next);
}

export async function registerCustomerAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const next = safeNext(String(formData.get("next") ?? ""));

  const result = await shopRegister({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    address: String(formData.get("address") ?? ""),
  });

  if (!result.ok) {
    // Un compte existait déjà : le lien de récupération est parti, il n'y a
    // rien à corriger dans le formulaire.
    return "pending" in result && result.pending
      ? { notice: result.error }
      : { error: result.error };
  }

  revalidatePath("/compte");
  redirect(next);
}

export async function logoutCustomerAction() {
  await shopLogout();
  revalidatePath("/compte");
  redirect("/");
}
