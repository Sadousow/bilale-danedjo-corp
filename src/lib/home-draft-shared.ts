/**
 * Constante partagée entre le proxy et le serveur.
 *
 * Elle vit à part parce que `home-draft.ts` importe `server-only` : le proxy
 * tourne sur l'edge et ne peut pas le charger.
 */

/**
 * En-tête posé par le proxy quand l'URL porte `?apercu=1`.
 *
 * Une mise en page ne reçoit pas les paramètres d'URL ; passer par un en-tête
 * permet au thème du brouillon d'être appliqué dès la mise en page.
 *
 * Le proxy l'écrase systématiquement : un visiteur qui l'enverrait lui-même
 * n'obtiendrait rien, et de toute façon la session administrateur est
 * vérifiée côté serveur avant de servir le brouillon.
 */
export const PREVIEW_HEADER = "x-apercu";
