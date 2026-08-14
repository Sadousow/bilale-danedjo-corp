"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";

import { saveCustomerAction, type CustomerState } from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md text-sm"
    >
      <Save className="w-4 h-4" />
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

export default function CustomerForm({
  values = {},
}: {
  values?: {
    id?: string;
    name?: string;
    phone?: string | null;
    address?: string | null;
    notes?: string;
    creditLimit?: number;
    nif?: string | null;
    rccm?: string | null;
  };
}) {
  const [state, formAction] = useActionState<CustomerState, FormData>(
    saveCustomerAction,
    {}
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="name">
            Nom complet *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={values.name}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={values.phone ?? ""}
            className={input}
            placeholder="+224 6xx xx xx xx"
          />
        </div>
        <div>
          <label className={label} htmlFor="creditLimit">
            Plafond de crédit (GNF)
          </label>
          <input
            id="creditLimit"
            name="creditLimit"
            type="number"
            min={0}
            defaultValue={values.creditLimit ?? 0}
            className={input}
          />
          <p className="mt-1 text-xs text-slate-400">0 = pas de plafond.</p>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="address">
            Adresse
          </label>
          <input
            id="address"
            name="address"
            defaultValue={values.address ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="nif">
            NIF
          </label>
          <input
            id="nif"
            name="nif"
            defaultValue={values.nif ?? ""}
            className={input}
          />
          <p className="mt-1 text-xs text-slate-400">
            Repris automatiquement sur les factures.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="rccm">
            RCCM
          </label>
          <input
            id="rccm"
            name="rccm"
            defaultValue={values.rccm ?? ""}
            className={input}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={values.notes}
            className={input}
          />
        </div>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        <Link href="/admin/clients" className="text-sm text-slate-500 hover:text-slate-800">
          Annuler
        </Link>
      </div>
    </form>
  );
}
