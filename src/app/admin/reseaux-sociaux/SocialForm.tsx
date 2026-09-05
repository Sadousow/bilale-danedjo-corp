"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Save } from "lucide-react";

import { PLATEFORMES, libelleCourt, type SocialKey } from "@/lib/reseaux-sociaux";
import { saveSocialAction, type SocialState } from "./actions";

/**
 * Saisie des liens de réseaux sociaux.
 *
 * Suit le motif utilisé partout ailleurs dans le back-office :
 * `useActionState` sur un `<form action={…}>`. Pas de `formAction` sur un
 * bouton — React 19 n'en transmet ni le `name` ni le `value` à une Server
 * Action, et le bouton paraît mort.
 */
export default function SocialForm({
  valeursInitiales,
}: {
  valeursInitiales: Record<SocialKey, string>;
}) {
  const [state, formAction, pending] = useActionState<SocialState, FormData>(
    saveSocialAction,
    {}
  );

  const label = "block text-sm font-medium text-slate-700 mb-1.5";
  const input =
    "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        {PLATEFORMES.map((plateforme) => {
          const erreur = state.champs?.[plateforme.key];
          /*
           * Après un refus, on réaffiche ce que le marchand avait tapé — pas la
           * valeur enregistrée. Sinon il perd sa saisie et doit retourner
           * chercher l'adresse.
           */
          const valeur =
            state.valeurs?.[plateforme.key] ?? valeursInitiales[plateforme.key];

          return (
            <div key={plateforme.key}>
              <label className={label} htmlFor={plateforme.key}>
                {plateforme.label}
              </label>
              <input
                id={plateforme.key}
                name={plateforme.key}
                defaultValue={valeur}
                placeholder={plateforme.exemple}
                aria-invalid={erreur ? true : undefined}
                aria-describedby={`aide-${plateforme.key}`}
                className={`${input} ${
                  erreur ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />

              {erreur ? (
                <p
                  id={`aide-${plateforme.key}`}
                  className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {erreur}
                </p>
              ) : (
                <p
                  id={`aide-${plateforme.key}`}
                  className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400"
                >
                  <span>
                    Votre nom d&apos;utilisateur ({plateforme.exemple}) ou
                    l&apos;adresse complète.
                  </span>
                  {valeursInitiales[plateforme.key] && (
                    <a
                      href={valeursInitiales[plateforme.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                    >
                      {libelleCourt(
                        plateforme.key,
                        valeursInitiales[plateforme.key]
                      )}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              )}
            </div>
          );
        })}

        <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          Laissez un champ vide pour retirer l&apos;icône de votre boutique.
        </p>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      {state.ok && (
        <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-light disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
