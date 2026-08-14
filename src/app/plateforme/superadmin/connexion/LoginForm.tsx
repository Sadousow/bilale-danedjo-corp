"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";

import { platformLoginAction, type ConsoleState } from "../actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-md"
    >
      <LogIn className="w-4 h-4" />
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}

export default function PlatformLoginForm() {
  const [state, formAction] = useActionState<ConsoleState, FormData>(
    platformLoginAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={input}
          autoComplete="username"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
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

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Submit />

      <p className="text-center">
        <Link
          href="/superadmin/mot-de-passe"
          className="text-sm text-slate-500 hover:text-brand-blue transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
