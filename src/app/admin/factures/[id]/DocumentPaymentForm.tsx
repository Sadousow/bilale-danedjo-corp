"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, HandCoins } from "lucide-react";

import { recordDocumentPaymentAction, type DocumentResult } from "../actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-md text-sm"
    >
      <HandCoins className="w-4 h-4" />
      {pending ? "Enregistrement…" : "Enregistrer le règlement"}
    </button>
  );
}

export default function DocumentPaymentForm({
  documentId,
  remaining,
}: {
  documentId: string;
  remaining: number;
}) {
  const [state, formAction] = useActionState<DocumentResult, FormData>(
    recordDocumentPaymentAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="documentId" value={documentId} />

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
          Montant reçu (GNF)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={1}
          max={remaining}
          required
          className={input}
          placeholder={String(remaining)}
        />
      </div>

      <div>
        <label htmlFor="method" className="block text-sm font-medium text-slate-700 mb-1">
          Mode
        </label>
        <select id="method" name="method" defaultValue="VIREMENT" className={input}>
          <option value="ESPECES">Espèces</option>
          <option value="ORANGE_MONEY">Orange Money</option>
          <option value="MTN_MOMO">MTN MoMo</option>
          <option value="VIREMENT">Virement</option>
        </select>
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1">
          Référence
        </label>
        <input id="note" name="note" className={input} placeholder="Facultatif" />
      </div>

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

      <Submit />
    </form>
  );
}
