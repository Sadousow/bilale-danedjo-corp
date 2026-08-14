"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";

import { createPaymentLinkAction } from "./actions";

/**
 * Bouton de règlement d'une facture d'abonnement.
 *
 * Quand le lien de paiement existe déjà, c'est un simple lien. Quand il
 * manque — clés indisponibles au moment de l'émission, ou numéro du payeur
 * jamais renseigné — le marchand le crée d'ici, au lieu de lire
 * « contactez-nous » sur le seul écran qui lui reste ouvert.
 */
export default function PayInvoice({
  paymentUrl,
  hasPayerNumber,
}: {
  paymentUrl: string | null;
  /** Un numéro de paiement est déjà connu : inutile de le redemander. */
  hasPayerNumber: boolean;
}) {
  const [state, action, pending] = useActionState(createPaymentLinkAction, {});

  if (paymentUrl) {
    return (
      <a
        href={paymentUrl}
        className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white font-semibold px-5 py-2.5 rounded-md text-sm whitespace-nowrap"
      >
        Payer maintenant
        <ExternalLink className="w-4 h-4" />
      </a>
    );
  }

  return (
    <form action={action} className="sm:min-w-[16rem]">
      {!hasPayerNumber && (
        <label className="block mb-2">
          <span className="block text-xs text-amber-800 mb-1">
            Numéro Mobile Money qui recevra la demande
          </span>
          <input
            type="tel"
            name="telephone"
            required
            placeholder="624 00 00 00"
            className="w-full px-3 py-2 rounded-md border border-amber-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-md text-sm whitespace-nowrap"
      >
        {pending ? "…" : "Payer maintenant"}
        {!pending && <ExternalLink className="w-4 h-4" />}
      </button>

      {state.error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
