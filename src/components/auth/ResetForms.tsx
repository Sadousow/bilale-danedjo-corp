"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Mail, KeyRound } from "lucide-react";

import type { RequestState, ApplyState } from "@/lib/form-state";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
    >
      {pending ? "Un instant…" : children}
    </button>
  );
}

/** Demande d'un lien de réinitialisation. */
export function RequestResetForm({
  action,
  backHref = "/login",
  backLabel = "Retour à la connexion",
}: {
  action: (prev: RequestState, formData: FormData) => Promise<RequestState>;
  backHref?: string;
  backLabel?: string;
}) {
  const [state, formAction] = useActionState<RequestState, FormData>(action, {});

  if (state.sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <p className="mt-4 text-sm text-slate-700 leading-relaxed">
          Si un compte existe avec cette adresse, un message vient de partir.
          Vérifiez votre boîte de réception, et vos indésirables.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Le lien reste valable une heure et ne fonctionne qu&apos;une fois.
        </p>
        <Link
          href={backHref}
          className="mt-6 inline-block text-sm text-brand-blue hover:text-brand-gold"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={label} htmlFor="email">
          Votre adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={input}
          placeholder="vous@exemple.com"
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Submit>Recevoir un lien</Submit>

      <p className="text-center">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-brand-blue">
          {backLabel}
        </Link>
      </p>
    </form>
  );
}

/** Choix du nouveau mot de passe, une fois le lien ouvert. */
export function ApplyResetForm({
  action,
  token,
  loginHref = "/login",
}: {
  action: (prev: ApplyState, formData: FormData) => Promise<ApplyState>;
  token: string;
  loginHref?: string;
}) {
  const [state, formAction] = useActionState<ApplyState, FormData>(action, {});

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <p className="mt-4 text-sm text-slate-700">
          Mot de passe modifié. Vous pouvez vous connecter.
        </p>
        <Link
          href={loginHref}
          className="mt-6 inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jeton" value={token} />

      <div>
        <label className={label} htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
        <p className="mt-1 text-xs text-slate-400">Au moins 8 caractères.</p>
      </div>

      <div>
        <label className={label} htmlFor="confirmation">
          Répétez-le
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Submit>Enregistrer le mot de passe</Submit>
    </form>
  );
}

/** Encadré commun aux quatre écrans. */
export function AuthCard({
  title,
  subtitle,
  icon = "mail",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: "mail" | "key";
  children: React.ReactNode;
}) {
  const Icon = icon === "key" ? KeyRound : Mail;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
            <Icon className="w-6 h-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-brand-blue">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
