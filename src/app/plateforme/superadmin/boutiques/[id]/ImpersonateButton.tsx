"use client";

import { useActionState, useEffect } from "react";

import { impersonateAction } from "../../actions";

/**
 * « Se connecter en tant que ».
 *
 * La navigation est faite ici, au navigateur, et non par un `redirect()`
 * serveur : la session s'ouvre sur le sous-domaine du marchand, donc il faut
 * un vrai changement de page pour que le cookie soit posé sur la bonne
 * origine. Une redirection d'action serveur vers une autre origine est suivie
 * en arrière-plan et le cookie se perd.
 */
export default function ImpersonateButton({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState(impersonateAction, {});

  useEffect(() => {
    if (state.url) window.location.assign(state.url);
  }, [state.url]);

  // Le bouton reste désactivé pendant la navigation : le jeton ne vaut que
  // soixante secondes, en réémettre un second n'aiderait personne.
  const busy = pending || Boolean(state.url);

  return (
    <div className="text-right">
      <form action={action}>
        <input type="hidden" name="id" value={tenantId} />
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-slate-300 disabled:opacity-50"
          title="Ouvre le back-office avec les droits de l'administrateur — action tracée au journal"
        >
          {busy ? "Ouverture…" : "Se connecter en tant que"}
        </button>
      </form>
      {state.error && (
        <p className="mt-1.5 max-w-xs text-xs text-red-600">{state.error}</p>
      )}
    </div>
  );
}
