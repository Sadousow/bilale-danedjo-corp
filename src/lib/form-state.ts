/**
 * États des formulaires d'authentification.
 *
 * Ils vivent ici, dans un module sans directive, pour une raison précise :
 * dans un fichier `"use server"`, **déclarer** un type se compile sans
 * difficulté — le reste du projet le fait partout — mais **ré-exporter un
 * type importé d'ailleurs** casse la compilation :
 *
 *     export type { RequestState };   // ✗ Turbopack en fait un export réel
 *     export type RequestState = {};  // ✓ effacé à la compilation
 *
 * Le transformateur de Next ne distingue pas la première forme d'un export
 * de valeur et génère un ré-export runtime vers un symbole qui n'existe pas.
 * Ni TypeScript ni ESLint ne le voient : l'erreur n'apparaît qu'au chargement
 * de la page.
 */

/** Demande d'un lien de réinitialisation. */
export type RequestState = { sent?: boolean; error?: string };

/** Choix effectif du nouveau mot de passe. */
export type ApplyState = { ok?: boolean; error?: string };
