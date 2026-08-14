/**
 * En-têtes de sécurité HTTP — fonctions pures.
 *
 * Ce fichier tourne dans le proxy, donc sur l'edge : aucune dépendance à
 * Node, aucun accès à la base. Il est séparé de `proxy.ts` pour être testable.
 */

export type HeaderOptions = {
  /** Jeton unique par requête, injecté dans les balises <script> par Next. */
  nonce: string;
  isDev: boolean;
  /** Origine du bucket d'images (S3_PUBLIC_URL), pour `img-src`. */
  storagePublicOrigin?: string | null;
  /** Origine de l'API du bucket (S3_ENDPOINT), pour `connect-src`. */
  storageApiOrigin?: string | null;
  /**
   * Mode observation : la politique est envoyée mais rien n'est bloqué, les
   * infractions apparaissent seulement dans la console du navigateur.
   * À utiliser quelques jours après la mise en ligne, le temps de vérifier
   * qu'aucune page légitime n'est prise pour cible.
   */
  reportOnly?: boolean;
  /**
   * Autorise la page à être placée dans un cadre par une page de la même
   * origine. Réservé à la vitrine, pour l'aperçu du back-office.
   */
  framableBySelf?: boolean;
};

/**
 * Le back-office, la caisse et la connexion ne doivent jamais être encadrés,
 * même par une page de la boutique : ce sont eux qui portent les boutons
 * dangereux. La vitrine, elle, doit l'être pour l'aperçu de l'éditeur.
 */
export function isFramableBySelf(pathname: string): boolean {
  return !(
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/plateforme") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/login"
  );
}

/** Nom de l'en-tête CSP : bloquant, ou simple observation. */
export function cspHeaderName(reportOnly: boolean | undefined): string {
  return reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}

/**
 * Origine d'une URL, ou null si la valeur est absente ou illisible.
 *
 * Un domaine nu — `images.guygou.com` au lieu de `https://images.guygou.com` —
 * est accepté et complété. C'est l'erreur de configuration la plus courante,
 * et sans schéma la valeur était jusqu'ici écartée en silence : les images du
 * bucket se retrouvaient bloquées par la politique de sécurité sans qu'aucun
 * message ne l'explique.
 */
export function originOf(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
      .origin;
  } catch {
    return null;
  }
}

function join(values: (string | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Politique de sécurité du contenu.
 *
 * Le choix important est `script-src` : un nonce plus `strict-dynamic`, sans
 * `unsafe-inline`. Un script injecté dans une page — par une faille XSS —
 * devrait deviner le nonce pour s'exécuter.
 *
 * `style-src` conserve `unsafe-inline`, et c'est un compromis assumé : un
 * nonce ne peut pas s'appliquer à un attribut `style="…"`, or l'application
 * en produit à chaque animation. Interdire l'inline casserait la vitrine sans
 * apporter grand-chose — une feuille de style injectée permet de défigurer
 * une page, pas d'exécuter du code.
 */
export function contentSecurityPolicy(options: HeaderOptions): string {
  const { nonce, isDev } = options;

  const directives = [
    `default-src 'self'`,

    // Empêche de réécrire la base des URL relatives de la page.
    `base-uri 'self'`,

    // Aucun <object>, <embed> ou <applet> : rien n'en utilise.
    `object-src 'none'`,

    // Pas de clickjacking : personne ne place nos pages dans un cadre pour
    // faire cliquer « Payer » à l'insu du visiteur.
    //
    // `'self'` sur la vitrine — l'éditeur du back-office l'affiche en aperçu,
    // et une origine étrangère reste refusée dans les deux cas. Le
    // back-office lui-même garde `'none'`.
    `frame-ancestors ${options.framableBySelf ? `'self'` : `'none'`}`,

    // Un formulaire de la page ne peut pas poster ailleurs que chez nous.
    `form-action 'self'`,

    `script-src ${join([
      `'self'`,
      `'nonce-${nonce}'`,
      // Les scripts chargés par un script de confiance héritent de sa
      // confiance : indispensable au découpage en bundles de Next.
      `'strict-dynamic'`,
      // React reconstruit les piles d'appel serveur avec eval, en dev
      // uniquement.
      isDev ? `'unsafe-eval'` : null,
    ])}`,

    `style-src 'self' 'unsafe-inline'`,

    `img-src ${join([
      `'self'`,
      // `data:` pour l'aperçu avant envoi, `blob:` pour le redimensionnement
      // dans le navigateur.
      `data:`,
      `blob:`,
      options.storagePublicOrigin,
      `https://images.unsplash.com`,
    ])}`,

    `font-src 'self' data:`,

    `connect-src ${join([
      `'self'`,
      // Le navigateur envoie les photos directement au bucket, sans passer
      // par le serveur : sans cette entrée, tout téléversement échoue.
      options.storageApiOrigin,
      options.storagePublicOrigin,
      isDev ? `ws: wss:` : null,
    ])}`,

    // `'self'` : l'éditeur du back-office affiche la vitrine en aperçu.
    // Les deux domaines Google servent la carte de la page Contact.
    //
    // Cette directive dit ce que *nos* pages ont le droit d'encadrer ;
    // `frame-ancestors` dit qui a le droit de *nous* encadrer. Les deux sont
    // nécessaires, et les confondre donne un cadre vide sans message clair.
    `frame-src 'self' https://maps.google.com https://www.google.com`,

    `media-src 'self'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,

    // En développement, le site tourne en clair : forcer HTTPS le casserait.
    isDev ? null : `upgrade-insecure-requests`,
  ];

  return directives.filter(Boolean).join("; ");
}

/**
 * Tous les en-têtes de sécurité, prêts à être posés sur une réponse.
 *
 * HSTS n'est ajouté qu'en production : sur `localhost`, il forcerait le
 * navigateur à passer en HTTPS pour des mois, y compris sur les autres
 * projets servis depuis la même adresse.
 */
export function securityHeaders(options: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    [cspHeaderName(options.reportOnly)]: contentSecurityPolicy(options),

    // Un fichier envoyé par un marchand ne doit jamais être réinterprété
    // comme du HTML sur la foi de son contenu.
    "X-Content-Type-Options": "nosniff",

    // Doublon volontaire de `frame-ancestors`, pour les navigateurs anciens.
    "X-Frame-Options": options.framableBySelf ? "SAMEORIGIN" : "DENY",

    // L'adresse complète d'une page d'administration ne part pas chez un
    // tiers ; seule l'origine est transmise, et uniquement en HTTPS.
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Aucune de ces interfaces n'est utilisée. Les refuser évite qu'un
    // script tiers les réclame un jour à notre place.
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",

    // Isole la fenêtre des pages ouvertes par window.open.
    "Cross-Origin-Opener-Policy": "same-origin",
  };

  if (!options.isDev) {
    // Deux ans, sous-domaines compris : chaque boutique est un sous-domaine.
    // `preload` n'est pas demandé — l'inscription sur la liste des
    // navigateurs est très difficile à défaire.
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains";
  }

  return headers;
}
