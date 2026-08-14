"use server";

import { redirect } from "next/navigation";

import { createSessionFor, destroySession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Renseignez votre email et votre mot de passe." };
  }

  const result = await createSessionFor(email, password);
  if (!result.ok) return { error: result.error };

  const fallback = result.role === "CAISSIER" ? "/pos" : "/admin";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : fallback;

  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
