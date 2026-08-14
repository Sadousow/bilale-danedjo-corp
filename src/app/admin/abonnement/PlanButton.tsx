"use client";

import { useActionState } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";

import { changeMyPlanAction } from "./actions";

/**
 * Bouton de changement d'offre.
 *
 * Le libellé dit franchement dans quel sens on va et quand ça prend effet :
 * « Passer à cette offre » laisserait croire que descendre coûte moins cher
 * dès demain, ce qui n'est pas le cas.
 */
export default function PlanButton({
  planId,
  direction,
  effectiveOn,
}: {
  planId: string;
  direction: "up" | "down";
  /** Date d'effet d'une baisse, en clair — nulle si l'échéance est passée. */
  effectiveOn?: string | null;
}) {
  const [state, action, pending] = useActionState(changeMyPlanAction, {});

  const up = direction === "up";

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="planId" value={planId} />
      <button
        type="submit"
        disabled={pending}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
          up
            ? "bg-brand-blue text-white hover:opacity-90"
            : "border border-slate-200 text-slate-600 hover:border-slate-300"
        }`}
      >
        {pending ? (
          "…"
        ) : (
          <>
            {up ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            {up ? "Passer à cette offre" : "Descendre à cette offre"}
          </>
        )}
      </button>

      <p className="mt-1.5 text-xs text-slate-400 text-center">
        {up
          ? "Effet immédiat"
          : effectiveOn
            ? `À partir du ${effectiveOn}`
            : "Dès le règlement de votre facture"}
      </p>

      {state.error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700">
          <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {state.ok}
        </p>
      )}
    </form>
  );
}
