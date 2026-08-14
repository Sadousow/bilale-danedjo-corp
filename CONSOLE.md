# La console plateforme — tableau de bord, fiches, relances

Suite de [CONSOLE-PLATEFORME.md](CONSOLE-PLATEFORME.md), qui décrit
l'installation et les comptes. Ce document couvre l'écran de pilotage, la
fiche par marchand, et deux bugs sérieux corrigés au passage.

---

## 1. Deux bugs, tous les deux invisibles

### La suspension ne suspendait rien

`Tenant.status` et `Subscription.status` sont deux choses différentes :

| Champ | Qui le change | Ce qu'il ferme |
| --- | --- | --- |
| `Subscription.status` | Le cycle de facturation | La vitrine, après le délai de grâce |
| `Tenant.status` | La plateforme, à la main | **Rien du tout** |

`isTenantSuspended()` existait dans `src/lib/tenant.ts` et n'était appelée
nulle part. Suspendre un marchand depuis la console changeait une ligne en
base et absolument rien d'autre : sa vitrine restait ouverte, ses employés
encaissaient, son back-office fonctionnait.

**Corrigé.** Le contrôle est posé aux cinq endroits par lesquels on entre :

```
src/app/(site)/layout.tsx      vitrine
src/app/admin/layout.tsx       back-office
src/app/pos/layout.tsx         caisse
src/app/login/page.tsx         page de connexion
src/lib/auth.ts                createSessionFor()
```

Le contrôle dans `createSessionFor()` compte autant que les autres : bloquer
seulement à l'affichage laisserait un jeton valide circuler.

Une seule exception, volontaire : une session ouverte depuis la console
(`session.impersonatedBy`) traverse la fermeture. Sans elle, la plateforme ne
pourrait pas inspecter la boutique qu'elle vient de suspendre — c'est
précisément le moment où on en a besoin.

Le marchand voit un écran sobre, sans motif : la page est publique, et
afficher « impayé » devant ses clients ne se fait pas.

### « Se connecter en tant que » n'allait pas chez le marchand

L'action serveur finissait par :

```ts
redirect(`http://${tenant.slug}.${root}/api/impersonation?jeton=${token}`);
```

Une redirection d'action serveur vers **une autre origine** n'est pas suivie
par le navigateur : le routeur la suit en `fetch`, le cookie de session est
posé sur une réponse que le navigateur jette, puis le routeur applique le
chemin final sur l'origine courante. L'agent atterrissait sur la plateforme,
sans message d'erreur, en croyant être chez le marchand.

Un second défaut se cachait derrière : dans le gestionnaire de route,
`new URL("/admin", request.url)` produisait `http://localhost:3000/admin` —
`request.url` porte l'origine du serveur, pas le sous-domaine visité.

**Corrigé des deux côtés.**

- L'action **renvoie** l'adresse ; `ImpersonateButton` fait la navigation avec
  `window.location.assign()`, donc un vrai changement de page.
- La route répond avec un `Location` **relatif**, résolu par le navigateur
  contre l'adresse réellement demandée. Plus aucune origine n'est devinée.

Aucun des deux n'était visible en typage ni au lint. Seul le navigateur les a
montrés.

---

## 2. Le tableau de bord

Quatre indicateurs, et c'est délibéré : un tableau qui en affiche vingt n'en
fait lire aucun.

| Carte | Ce qu'elle répond |
| --- | --- |
| Recette mensuelle | Combien la plateforme encaisse réellement |
| Essais en cours | Qui est sur le point de partir ou de payer |
| Impayés | Combien d'argent est en attente |
| Jamais publiées | Qui s'est inscrit sans jamais ouvrir |

**La recette ne compte que les abonnements `ACTIF`.** Un essai n'a rien
rapporté, un impayé non plus. Les inclure donnerait un chiffre flatteur et
faux, et c'est exactement le genre de chiffre sur lequel on prend de
mauvaises décisions. Le potentiel des essais est affiché à part, en petit.

Le statut de chaque abonnement est **recalculé à la lecture** par
`effectiveStatus()`, jamais lu tel quel : la passe de facturation peut ne pas
avoir tourné depuis hier, et un compteur faux est pire que pas de compteur.

---

## 3. Recherche, filtres, relances

La barre écrit dans l'URL (`?filtre=…&q=…`) : une vue se partage, se met en
favori, et survit à un rechargement après une suspension.

La recherche porte sur le nom, l'identifiant, le domaine, le téléphone et
l'email — la frappe attend 300 ms avant de naviguer.

### Ce que « à relancer » veut dire

| Alerte | Déclencheur |
| --- | --- |
| Jamais publiée | La vitrine n'a jamais été ouverte au public |
| Essai bientôt fini | L'essai se termine dans 7 jours ou moins |
| Aucune vente récente | 10 jours sans vente ni commande |
| Facture impayée | Au moins une facture `EN_ATTENTE` ou `ECHOUEE` |

« Aucune vente récente » se compte depuis la date de création quand il n'y a
jamais eu de vente : sans ça, toute boutique inscrite le matin serait
signalée dès le premier jour et noierait les vraies alertes.

Le filtre **Suspendues** attrape les deux fermetures — administrative
(`Tenant.status`) et pour non-paiement (`Subscription.status`). De la console,
ce sont deux façons d'être fermé, et on veut les deux.

---

## 4. La fiche par boutique

`/superadmin/boutiques/<id>` — coordonnées, activité, abonnement, factures,
comptes, adresses, et les actions : se connecter en tant que, suspendre ou
réactiver, changer d'offre, marquer une facture payée.

Le sélecteur d'offre reste inerte tant que la sélection est celle en cours :
une confirmation qui ne change rien est le meilleur moyen de faire douter
celui qui vient de cliquer.

---

## 5. Une séparation qui n'est pas cosmétique

`src/lib/console-filters.ts` contient le vocabulaire et le filtrage —
**sans base de données**. `src/lib/platform-shops.ts` contient les requêtes,
et porte `import "server-only"`.

La barre de filtres est un composant client. Tant que les libellés vivaient
dans le module `server-only`, le bundler tirait Prisma dans le paquet du
navigateur et la page ne compilait plus. La séparation a un second effet :
le filtrage est testable sans serveur, ce que fait
`scripts/test-console.mjs` (36 vérifications).

Le filtrage se fait en mémoire, pas en SQL. La liste y tient déjà pour
calculer les alertes, et un `where` dupliquerait la définition de
« à relancer » — deux définitions de la même chose finissent toujours par
diverger.

---

## 6. Vérification

```bash
npx tsc --noEmit
npx eslint src
npx tsx scripts/test-console.mjs      # 36 vérifications
```

Contrôlé dans le navigateur, sur une boutique suspendue :

| Chemin | Résultat |
| --- | --- |
| `ryastore.localhost:3000/` | Écran de fermeture |
| `…/login` | Écran de fermeture |
| `…/admin` | Écran de fermeture |
| `…/pos` | Écran de fermeture |
| « Se connecter en tant que » | Back-office ouvert, bandeau orange nominatif |
| Suspendre puis réactiver | Fiche à jour immédiatement, dans les deux sens |
