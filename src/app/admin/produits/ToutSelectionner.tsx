"use client";

import { useId } from "react";

/**
 * Case d'en-tête « tout sélectionner ».
 *
 * Le seul morceau de cette page qui exige du JavaScript. Le reste — cases,
 * publication en lot, bascule d'une ligne — passe par un formulaire ordinaire
 * et des Server Actions, donc fonctionne même si le script ne charge pas. Sur
 * une connexion guinéenne, c'est une propriété qui compte.
 *
 * On agit sur les cases du formulaire parent plutôt que sur un état React : les
 * lignes sont rendues côté serveur, il n'y a rien à synchroniser.
 */
export default function ToutSelectionner({ total }: { total: number }) {
  const id = useId();

  if (total === 0) return null;

  return (
    <input
      id={id}
      type="checkbox"
      aria-label="Sélectionner tous les articles publiables"
      title="Tout sélectionner"
      className="h-4 w-4 rounded border-slate-300 accent-brand-blue"
      onChange={(event) => {
        const form = event.currentTarget.closest("form");
        if (!form) return;
        for (const box of form.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][name="ids"]:not(:disabled)'
        )) {
          box.checked = event.currentTarget.checked;
        }
      }}
    />
  );
}
