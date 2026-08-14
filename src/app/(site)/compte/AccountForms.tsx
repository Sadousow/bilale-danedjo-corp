"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn, Mail, UserPlus } from "lucide-react";

import {
  loginCustomerAction,
  registerCustomerAction,
  type AccountState,
} from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-md transition-colors"
    >
      {pending ? "Un instant…" : children}
    </button>
  );
}

function Error({ state }: { state: AccountState }) {
  // Un compte déjà existant n'est pas une erreur de saisie : le lien de
  // récupération est parti, et l'afficher en rouge inquiéterait pour rien.
  if (state.notice) {
    return (
      <p className="flex items-start gap-2 text-sm text-brand-blue bg-brand-blue/5 border border-brand-blue/20 rounded-md px-3 py-2">
        <Mail className="w-4 h-4 shrink-0 mt-0.5" />
        {state.notice}
      </p>
    );
  }

  if (!state.error) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {state.error}
    </p>
  );
}

export default function AccountForms({ next }: { next: string }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginState, loginAction] = useActionState<AccountState, FormData>(
    loginCustomerAction,
    {}
  );
  const [registerState, registerAction] = useActionState<AccountState, FormData>(
    registerCustomerAction,
    {}
  );

  return (
    <div className="max-w-md mx-auto">
      <div className="flex border-b border-slate-200 mb-6">
        {(["login", "register"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {key === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className={label} htmlFor="identifier">
              Email ou téléphone
            </label>
            <input
              id="identifier"
              name="identifier"
              required
              className={input}
              autoComplete="username"
            />
          </div>
          <div>
            <label className={label} htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={input}
              autoComplete="current-password"
            />
          </div>
          <Error state={loginState} />
          <Submit>
            <LogIn className="w-4 h-4" />
            Se connecter
          </Submit>
        </form>
      ) : (
        <form action={registerAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className={label} htmlFor="name">
              Nom complet
            </label>
            <input id="name" name="name" required className={input} autoComplete="name" />
          </div>
          <div>
            <label className={label} htmlFor="reg-phone">
              Téléphone
            </label>
            <input
              id="reg-phone"
              name="phone"
              required
              className={input}
              placeholder="624 39 03 32"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          <div>
            <label className={label} htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              className={input}
              autoComplete="email"
            />
          </div>
          <div>
            <label className={label} htmlFor="reg-address">
              Adresse de livraison (facultatif)
            </label>
            <input id="reg-address" name="address" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="reg-password">
              Mot de passe
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              required
              minLength={8}
              className={input}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
            />
          </div>
          <Error state={registerState} />
          <Submit>
            <UserPlus className="w-4 h-4" />
            Créer mon compte
          </Submit>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        Le compte est facultatif : vous pouvez commander sans en créer un.
      </p>
    </div>
  );
}
