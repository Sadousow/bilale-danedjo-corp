"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

import { runCycleAction, type BillingState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 border border-slate-300 hover:bg-white disabled:opacity-60 text-slate-700 font-medium px-4 py-2 rounded-md text-sm"
    >
      <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Passage en cours…" : "Lancer le passage de facturation"}
    </button>
  );
}

export default function CycleButton() {
  const [state, formAction] = useActionState<BillingState, FormData>(
    runCycleAction,
    {}
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Submit />
      </form>

      {state.error && (
        <p className="flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-start gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {state.ok}
        </p>
      )}
    </div>
  );
}
