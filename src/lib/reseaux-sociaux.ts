/**
 * Réseaux sociaux d'une boutique — normalisation et validation.
 *
 * Module **pur** : aucune requête, aucun accès réseau, aucun import serveur.
 * Toute la logique est ici pour être testable d'un trait par
 * `npm run test:reseaux`, sans base de données.
 *
 * Trois défauts de l'ancienne saisie, dans `/admin/apparence`, que ce module
 * corrige :
 *
 *   1. Un marchand tape « @maboutique », son pseudo — pas une adresse web.
 *      L'ancienne normalisation produisait `https://@maboutique`, un lien mort
 *      qui s'affichait quand même en pied de page.
 *   2. Un marchand colle son lien Facebook dans le champ Instagram. Rien ne
 *      le vérifiait : l'icône Instagram pointait vers Facebook.
 *   3. Aucune de ces erreurs ne se voit à la saisie. Elles se découvrent en
 *      cliquant sur son propre pied de page, ou jamais.
 */

/** Clé technique d'un réseau — correspond aux colonnes de `Settings`. */
export type SocialKey = "facebook" | "instagram" | "tiktok";

export type SocialPlatform = {
  key: SocialKey;
  /** Nom affiché au marchand. */
  label: string;
  /** Colonne correspondante dans `Settings`. */
  champ: "socialFacebook" | "socialInstagram" | "socialTiktok";
  /** Domaines acceptés, sans `www.`. Le premier sert à construire l'URL. */
  domaines: string[];
  /** Exemple montré sous le champ. */
  exemple: string;
  /** Le réseau utilise-t-il un `@` devant le pseudo ? */
  arobase: boolean;
};

export const PLATEFORMES: SocialPlatform[] = [
  {
    key: "facebook",
    label: "Facebook",
    champ: "socialFacebook",
    domaines: ["facebook.com", "fb.com", "m.facebook.com", "fb.me"],
    exemple: "facebook.com/maboutique",
    arobase: false,
  },
  {
    key: "instagram",
    label: "Instagram",
    champ: "socialInstagram",
    domaines: ["instagram.com", "instagr.am"],
    exemple: "@maboutique",
    arobase: true,
  },
  {
    key: "tiktok",
    label: "TikTok",
    champ: "socialTiktok",
    domaines: ["tiktok.com", "vm.tiktok.com"],
    exemple: "@maboutique",
    arobase: true,
  },
];

export const PLATEFORME_PAR_CLE: Record<SocialKey, SocialPlatform> =
  Object.fromEntries(PLATEFORMES.map((p) => [p.key, p])) as Record<
    SocialKey,
    SocialPlatform
  >;

export type ResultatLien =
  | { ok: true; url: string }
  /** Champ laissé vide : ce n'est pas une erreur, le lien est simplement absent. */
  | { ok: true; url: "" }
  | { ok: false; erreur: string };

/** Retire `www.` et le point final éventuel, pour comparer des domaines. */
function hoteNormalise(hote: string): string {
  return hote.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

/**
 * Un pseudo acceptable : lettres, chiffres, point, tiret, tiret bas.
 * Volontairement permissif — les règles exactes diffèrent d'un réseau à
 * l'autre et changent ; refuser un pseudo valide serait pire que l'inverse.
 */
const PSEUDO = /^[A-Za-z0-9._-]{1,60}$/;

/**
 * Transforme ce que le marchand a tapé en URL utilisable, ou explique le refus.
 *
 * Accepte, pour Instagram : `@maboutique`, `maboutique`,
 * `instagram.com/maboutique`, `https://www.instagram.com/maboutique/`,
 * et tout cela avec des espaces autour.
 */
export function normaliserLien(cle: SocialKey, saisie: string): ResultatLien {
  const plateforme = PLATEFORME_PAR_CLE[cle];
  const valeur = (saisie ?? "").trim();

  if (!valeur) return { ok: true, url: "" };

  // Cas 1 — un pseudo, avec ou sans arobase. On construit l'URL nous-mêmes.
  const sansArobase = valeur.startsWith("@") ? valeur.slice(1) : valeur;
  const ressembleAUnDomaine = sansArobase.includes(".") || sansArobase.includes("/");

  if (valeur.startsWith("@") || !ressembleAUnDomaine) {
    if (!PSEUDO.test(sansArobase)) {
      return {
        ok: false,
        erreur:
          `« ${valeur} » n'est ni une adresse ni un nom d'utilisateur valide. ` +
          `Exemple attendu : ${plateforme.exemple}`,
      };
    }
    return {
      ok: true,
      url: `https://${plateforme.domaines[0]}/${sansArobase}`,
    };
  }

  // Cas 2 — une adresse. On complète le protocole s'il manque.
  const avecProtocole = /^[a-z][a-z0-9+.-]*:\/\//i.test(valeur)
    ? valeur
    : `https://${valeur.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(avecProtocole);
  } catch {
    return {
      ok: false,
      erreur: `« ${valeur} » n'est pas une adresse valide. Exemple : ${plateforme.exemple}`,
    };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      ok: false,
      erreur: `Seules les adresses web sont acceptées. Exemple : ${plateforme.exemple}`,
    };
  }

  /*
   * La vérification qui manquait : le domaine doit être celui du réseau.
   *
   * Sans elle, une adresse Facebook collée dans le champ Instagram donne une
   * icône Instagram qui mène chez Facebook. Le marchand ne s'en aperçoit qu'en
   * cliquant sur son propre pied de page.
   */
  const hote = hoteNormalise(url.hostname);
  const reconnu = plateforme.domaines.some(
    (d) => hote === d || hote.endsWith(`.${d}`)
  );

  if (!reconnu) {
    const autre = PLATEFORMES.find((p) =>
      p.domaines.some((d) => hote === d || hote.endsWith(`.${d}`))
    );
    return {
      ok: false,
      erreur: autre
        ? `Cette adresse est un lien ${autre.label}, pas ${plateforme.label}. ` +
          `Placez-la dans le champ ${autre.label}.`
        : `Cette adresse ne pointe pas vers ${plateforme.label} ` +
          `(attendu : ${plateforme.domaines[0]}).`,
    };
  }

  // On garde l'adresse telle quelle, sans la barre finale — deux liens qui ne
  // diffèrent que par ce caractère créeraient une fausse modification.
  url.hash = "";
  const propre = url.toString().replace(/\/$/, "");
  return { ok: true, url: propre };
}

/** Ce qu'on affiche au marchand à la place d'une longue URL. */
export function libelleCourt(cle: SocialKey, url: string): string {
  if (!url) return "";
  try {
    const chemin = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    if (!chemin) return hoteNormalise(new URL(url).hostname);
    return PLATEFORME_PAR_CLE[cle].arobase ? `@${chemin}` : chemin;
  } catch {
    return url;
  }
}

/** Normalise les trois champs d'un coup ; renvoie les erreurs par réseau. */
export function normaliserTout(saisies: Record<SocialKey, string>): {
  valeurs: Record<SocialKey, string>;
  erreurs: Partial<Record<SocialKey, string>>;
} {
  const valeurs = {} as Record<SocialKey, string>;
  const erreurs: Partial<Record<SocialKey, string>> = {};

  for (const plateforme of PLATEFORMES) {
    const resultat = normaliserLien(plateforme.key, saisies[plateforme.key] ?? "");
    if (resultat.ok) {
      valeurs[plateforme.key] = resultat.url;
    } else {
      /*
       * On conserve la saisie fautive plutôt que de l'effacer : le marchand
       * doit retrouver ce qu'il avait tapé pour le corriger, pas un champ vide.
       */
      valeurs[plateforme.key] = (saisies[plateforme.key] ?? "").trim();
      erreurs[plateforme.key] = resultat.erreur;
    }
  }

  return { valeurs, erreurs };
}
