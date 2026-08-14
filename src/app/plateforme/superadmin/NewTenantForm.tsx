"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

import { createTenantAction, type ConsoleState } from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md text-sm"
    >
      <Plus className="w-4 h-4" />
      {pending ? "Création…" : "Créer la boutique"}
    </button>
  );
}

export default function NewTenantForm({ rootDomain }: { rootDomain: string }) {
  const [state, formAction] = useActionState<ConsoleState, FormData>(
    createTenantAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="name">
            Nom de l&apos;entreprise
          </label>
          <input id="name" name="name" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="slug">
            Adresse
          </label>
          <div className="flex items-center">
            <input
              id="slug"
              name="slug"
              className={`${input} rounded-r-none`}
              placeholder="déduite du nom si vide"
            />
            <span className="px-2 py-2.5 border border-l-0 border-slate-300 rounded-r-md bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
              .{rootDomain}
            </span>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="adminName">
            Nom du gérant
          </label>
          <input id="adminName" name="adminName" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="adminEmail">
            Email du gérant
          </label>
          <input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            className={input}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="password">
            Mot de passe provisoire
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            className={input}
            placeholder="8 caractères minimum — à communiquer au marchand"
          />
        </div>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {state.ok}
        </p>
      )}

      <Submit />
    </form>
  );
}
