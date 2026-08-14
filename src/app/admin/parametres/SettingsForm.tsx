"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

import type { CompanySettings } from "@/lib/settings";
import { saveSettingsAction, type SettingsState } from "./actions";

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

export default function SettingsForm({ values }: { values: CompanySettings }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    saveSettingsAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Identité de l&apos;entreprise</h2>
        <p className="text-sm text-slate-500">
          Ces informations apparaissent en en-tête des factures, proformas et
          bons de livraison.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="companyName">
              Raison sociale *
            </label>
            <input
              id="companyName"
              name="companyName"
              required
              defaultValue={values.companyName}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="companyAddress">
              Adresse
            </label>
            <input
              id="companyAddress"
              name="companyAddress"
              defaultValue={values.companyAddress}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="companyPhone">
              Téléphone
            </label>
            <input
              id="companyPhone"
              name="companyPhone"
              defaultValue={values.companyPhone}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="companyEmail">
              Email
            </label>
            <input
              id="companyEmail"
              name="companyEmail"
              type="email"
              defaultValue={values.companyEmail}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="nif">
              NIF
            </label>
            <input id="nif" name="nif" defaultValue={values.nif} className={input} />
            <p className="mt-1 text-xs text-slate-400">
              Numéro d&apos;identification fiscale.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="rccm">
              RCCM
            </label>
            <input
              id="rccm"
              name="rccm"
              defaultValue={values.rccm}
              className={input}
            />
            <p className="mt-1 text-xs text-slate-400">
              Registre du commerce et du crédit mobilier.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Coordonnées bancaires</h2>
        <p className="text-sm text-slate-500">
          Affichées en pied de facture pour les règlements par virement.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="bankName">
              Banque
            </label>
            <input
              id="bankName"
              name="bankName"
              defaultValue={values.bankName}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="bankAccount">
              Numéro de compte
            </label>
            <input
              id="bankAccount"
              name="bankAccount"
              defaultValue={values.bankAccount}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="bankIban">
              IBAN
            </label>
            <input
              id="bankIban"
              name="bankIban"
              defaultValue={values.bankIban}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="bankSwift">
              Code SWIFT / BIC
            </label>
            <input
              id="bankSwift"
              name="bankSwift"
              defaultValue={values.bankSwift}
              className={input}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Facturation</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="defaultVatRate">
              Taux de TVA par défaut (%)
            </label>
            <input
              id="defaultVatRate"
              name="defaultVatRate"
              type="number"
              min={0}
              max={100}
              defaultValue={values.defaultVatRate}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="proformaValidityDays">
              Validité des proformas (jours)
            </label>
            <input
              id="proformaValidityDays"
              name="proformaValidityDays"
              type="number"
              min={1}
              defaultValue={values.proformaValidityDays}
              className={input}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="vatEnabledByDefault"
            defaultChecked={values.vatEnabledByDefault}
            className="w-4 h-4 accent-brand-blue"
          />
          Appliquer la TVA par défaut sur les nouveaux documents
        </label>

        <div>
          <label className={label} htmlFor="paymentTerms">
            Conditions de paiement par défaut
          </label>
          <textarea
            id="paymentTerms"
            name="paymentTerms"
            rows={2}
            defaultValue={values.paymentTerms}
            className={input}
          />
        </div>

        <div>
          <label className={label} htmlFor="signatureLabel">
            Libellé de la zone de signature
          </label>
          <input
            id="signatureLabel"
            name="signatureLabel"
            defaultValue={values.signatureLabel}
            className={input}
          />
        </div>

        <div>
          <label className={label} htmlFor="documentFooter">
            Pied de page des documents
          </label>
          <textarea
            id="documentFooter"
            name="documentFooter"
            rows={2}
            defaultValue={values.documentFooter}
            className={input}
            placeholder="Mentions complémentaires, capital social, site web…"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Boutique en ligne</h2>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="shopEnabled"
            defaultChecked={values.shopEnabled}
            className="w-4 h-4 accent-brand-blue"
          />
          Accepter les commandes sur le site
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="onlinePaymentEnabled"
            defaultChecked={values.onlinePaymentEnabled}
            className="w-4 h-4 accent-brand-blue"
          />
          Proposer le paiement en ligne (Djomy)
        </label>
        <p className="text-xs text-slate-400 -mt-2 ml-7">
          Nécessite <code>DJOMY_CLIENT_ID</code> et{" "}
          <code>DJOMY_CLIENT_SECRET</code> dans le fichier <code>.env</code>.
          Sans ces clés, l&apos;option reste masquée pour les clients.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="minOrderAmount">
              Montant minimum de commande (GNF)
            </label>
            <input
              id="minOrderAmount"
              name="minOrderAmount"
              type="number"
              min={0}
              defaultValue={values.minOrderAmount}
              className={input}
            />
            <p className="mt-1 text-xs text-slate-400">0 = pas de minimum.</p>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="orderConfirmation">
            Message de confirmation de commande
          </label>
          <textarea
            id="orderConfirmation"
            name="orderConfirmation"
            rows={2}
            defaultValue={values.orderConfirmation}
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
