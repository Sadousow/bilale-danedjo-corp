"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, KeyRound, UserPlus } from "lucide-react";

import {
  createUserAction,
  resetPasswordAction,
  type UserState,
} from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Feedback({ state }: { state: UserState }) {
  return (
    <>
      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {state.ok}
        </p>
      )}
    </>
  );
}

function Submit({ label: text, icon }: { label: string; icon: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-md text-sm"
    >
      {icon}
      {pending ? "Enregistrement…" : text}
    </button>
  );
}

/** Sélecteur de rôle qui soumet automatiquement le formulaire parent. */
export function RoleSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="role"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="px-2 py-1.5 border border-slate-300 rounded-md text-xs"
    >
      <option value="CAISSIER">Caissier</option>
      <option value="GERANT">Gérant</option>
      <option value="ADMIN">Administrateur</option>
    </select>
  );
}

export function CreateUserForm() {
  const [state, formAction] = useActionState<UserState, FormData>(
    createUserAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">
          Nom complet
        </label>
        <input id="name" name="name" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="password">
          Mot de passe provisoire
        </label>
        <input
          id="password"
          name="password"
          type="text"
          minLength={8}
          required
          className={input}
          placeholder="8 caractères minimum"
        />
      </div>
      <div>
        <label className={label} htmlFor="role">
          Rôle
        </label>
        <select id="role" name="role" className={input} defaultValue="CAISSIER">
          <option value="CAISSIER">Caissier — accès à la caisse uniquement</option>
          <option value="GERANT">Gérant — back-office complet</option>
          <option value="ADMIN">Administrateur — accès total</option>
        </select>
      </div>

      <Feedback state={state} />
      <Submit label="Créer le compte" icon={<UserPlus className="w-4 h-4" />} />
    </form>
  );
}

export function ResetPasswordForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState<UserState, FormData>(
    resetPasswordAction,
    {}
  );
  const [id, setId] = useState("");

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="reset-id">
          Utilisateur
        </label>
        <select
          id="reset-id"
          name="id"
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          className={input}
        >
          <option value="">— Choisir —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="reset-password">
          Nouveau mot de passe
        </label>
        <input
          id="reset-password"
          name="password"
          type="text"
          minLength={8}
          required
          className={input}
        />
      </div>

      <Feedback state={state} />
      <Submit
        label="Réinitialiser le mot de passe"
        icon={<KeyRound className="w-4 h-4" />}
      />
    </form>
  );
}
