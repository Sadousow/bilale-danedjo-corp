/**
 * Traduction du paramètre `?ok=` en message pour le marchand.
 *
 * Les Server Actions déclenchées par un `<form>` simple ne peuvent rien
 * retourner à l'écran : elles redirigent. Le compte rendu voyage donc dans
 * l'URL, et c'est ici qu'il redevient une phrase.
 *
 * Module pur, testé par `npm run test:meta` — un compte rendu faux est aussi
 * trompeur qu'une action ratée.
 */

export type TonMessage = "succes" | "avertissement";

export type MessageAction = { ton: TonMessage; texte: string };

function pluriel(n: number, singulier: string, plurielMot = `${singulier}s`) {
  return `${n} ${n > 1 ? plurielMot : singulier}`;
}

/**
 * `ok` prend les formes `publies-<pris>-<refuses>`, `retires-<n>`, ou un mot
 * seul. Une valeur inconnue ou trafiquée ne produit aucun message plutôt
 * qu'un message faux — le paramètre vient de l'URL, donc de l'utilisateur.
 */
export function messageAction(ok: string | undefined): MessageAction | null {
  if (!ok) return null;

  if (ok === "aucune-selection") {
    return {
      ton: "avertissement",
      texte: "Aucun article sélectionné. Cochez les articles à traiter.",
    };
  }

  if (ok === "non-publiable") {
    return {
      ton: "avertissement",
      texte:
        "Cet article ne remplit pas les conditions de Meta. Le motif est indiqué dans la colonne Meta.",
    };
  }

  if (ok === "introuvable") {
    return { ton: "avertissement", texte: "Article introuvable." };
  }

  const retires = /^retires-(\d+)$/.exec(ok);
  if (retires) {
    const n = Number(retires[1]);
    return n === 0
      ? { ton: "avertissement", texte: "Aucun article n'était publié." }
      : {
          ton: "succes",
          texte: `${pluriel(n, "article")} retiré${n > 1 ? "s" : ""} de la sélection Meta.`,
        };
  }

  const publies = /^publies-(\d+)-(\d+)$/.exec(ok);
  if (publies) {
    const pris = Number(publies[1]);
    const refuses = Number(publies[2]);

    if (pris === 0 && refuses === 0) {
      return { ton: "avertissement", texte: "Aucun article traité." };
    }
    if (pris === 0) {
      return {
        ton: "avertissement",
        texte: `Aucun article publié : ${pluriel(refuses, "article")} ne remplit${refuses > 1 ? "" : ""} pas les conditions de Meta.`,
      };
    }
    /*
     * Le cas mixte doit se dire en entier. Annoncer seulement les réussites
     * laisserait le marchand croire que tout est parti — et découvrir plus
     * tard que la moitié de sa sélection n'a jamais été prise.
     */
    if (refuses > 0) {
      return {
        ton: "avertissement",
        texte: `${pluriel(pris, "article")} marqué${pris > 1 ? "s" : ""} pour Meta. ${pluriel(refuses, "autre")} ignoré${refuses > 1 ? "s" : ""} : conditions non remplies.`,
      };
    }
    return {
      ton: "succes",
      texte: `${pluriel(pris, "article")} marqué${pris > 1 ? "s" : ""} pour Meta. Rien n'est encore envoyé : la connexion Meta n'existe pas.`,
    };
  }

  return null;
}
