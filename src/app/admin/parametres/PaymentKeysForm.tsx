"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Copy, Save } from "lucide-react";

import {
  savePaymentKeysAction,
  type PaymentKeysState,
} from "./paiement-actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm";
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

export default function PaymentKeysForm({
  clientId,
  hasSecret,
  enabled,
  webhookUrl,
}: {
  clientId: string;
  hasSecret: boolean;
  enabled: boolean;
  webhookUrl: string;
}) {
  const [state, formAction] = useActionState<PaymentKeysState, FormData>(
    savePaymentKeysAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-slate-500">
        Pour encaisser en ligne (Orange Money, MTN MoMo, carte), créez un compte
        sur{" "}
        <a
          href="https://djomy.africa"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue hover:underline"
        >
          djomy.africa
        </a>{" "}
        et récupérez vos clés dans l&apos;espace marchand, rubrique
        Développeurs. Les fonds arrivent directement sur votre compte.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="djomyClientId">
            Clé API (clientId)
          </label>
          <input
            id="djomyClientId"
            name="djomyClientId"
            defaultValue={clientId}
            className={input}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={label} htmlFor="djomyClientSecret">
            Clé secrète
          </label>
          <input
            id="djomyClientSecret"
            name="djomyClientSecret"
            type="password"
            className={input}
            autoComplete="off"
            placeholder={
              hasSecret ? "Enregistrée — laisser vide pour la conserver" : ""
            }
          />
          <p className="mt-1 text-xs text-slate-400">
            Chiffrée avant enregistrement, jamais réaffichée.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="djomyEnabled"
          defaultChecked={enabled}
          className="w-4 h-4 accent-brand-blue"
        />
        Proposer le paiement en ligne à mes clients
      </label>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm font-medium text-slate-700 mb-1">
          URL de notification (webhook)
        </p>
        <p className="text-xs text-slate-500 mb-2">
          À déclarer dans votre espace Djomy. C&apos;est elle qui confirme les
          paiements aboutis.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-[11px] bg-white border border-slate-200 rounded px-2 py-1.5 break-all select-all">
            {webhookUrl}
          </code>
          <Copy className="w-4 h-4 text-slate-300 shrink-0" />
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
