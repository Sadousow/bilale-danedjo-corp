"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { formatPrice } from "@/lib/format";
import { changePlanAction } from "../../abonnements/actions";

type PlanOption = { id: string; name: string; priceMonthly: number };

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium disabled:opacity-40 hover:opacity-90"
    >
      {pending ? "…" : "Changer"}
    </button>
  );
}

/**
 * Changement d'offre depuis la fiche.
 *
 * Le bouton reste inerte tant que la sélection est celle en cours : une
 * confirmation qui ne change rien est le meilleur moyen de faire douter
 * celui qui vient de cliquer.
 */
export default function PlanPicker({
  subscriptionId,
  currentPlanId,
  plans,
}: {
  subscriptionId: string;
  currentPlanId: string;
  plans: PlanOption[];
}) {
  const [choice, setChoice] = useState(currentPlanId);

  return (
    <form action={changePlanAction} className="flex items-end gap-2">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <div className="flex-1">
        <label
          htmlFor="planId"
          className="block text-xs text-slate-500 mb-1"
        >
          Changer d&apos;offre
        </label>
        <select
          id="planId"
          name="planId"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {formatPrice(plan.priceMonthly)}
            </option>
          ))}
        </select>
      </div>
      <Submit disabled={choice === currentPlanId} />
    </form>
  );
}
