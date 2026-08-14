# Phase 3 — inscription et console plateforme

Suite de [ARCHITECTURE-SAAS.md](ARCHITECTURE-SAAS.md),
[MIGRATION-MULTITENANT.md](MIGRATION-MULTITENANT.md) et
[DEPLOIEMENT-SAAS.md](DEPLOIEMENT-SAAS.md).

---

## 1. Mise en route

```bash
npm run db:migrate:deploy          # PlatformUser, AuditLog
npx prisma generate
npm run platform:user              # crée votre compte de console
```

Le script demande nom, email et mot de passe. Le mot de passe est masqué
pendant la frappe et n'apparaît pas dans l'historique du terminal. Relancé
avec le même email, il met à jour le compte : c'est aussi la procédure de
réinitialisation.

La console est ensuite sur **`tondomaine.com/superadmin`**.

---

## 2. Trois populations, trois cookies

| Cookie | Périmètre | Durée |
| ------ | --------- | ----- |
| `bdc_platform` | Console plateforme | 8 h |
| `bdc_session` | Personnel d'une boutique | 12 h |
| `bdc_client` | Acheteur d'une boutique | 30 jours |

Les trois sont indépendants. Un jeton de boutique reste rejeté sur une autre
boutique, comme en phase 1.

---

## 3. Inscription en libre-service

`tondomaine.com/inscription`

Le marchand saisit le nom de son entreprise, choisit son adresse — vérifiée en
direct, sans rechargement — puis crée son compte administrateur.

Tout est écrit dans **une seule transaction** : boutique, réglages,
administrateur, catégories et zones de livraison par défaut. Si une étape
échoue, rien n'est enregistré. Une boutique à moitié créée serait inutilisable
et pénible à réparer à la main.

La boutique démarre au statut **ESSAI**, ce qui la rend fonctionnelle mais
non indexée par les moteurs de recherche.

À la fin, on affiche l'adresse et un lien vers `/login`. **Aucune session
n'est ouverte** : le cookie serait posé sur le domaine racine, pas sur le
sous-domaine de la boutique. Le marchand se connecte depuis sa propre adresse.

---

## 4. Console

**Liste des boutiques** — statut, adresse effective (domaine personnalisé s'il
existe, sinon le sous-domaine), nombre d'utilisateurs, de produits et de
commandes.

**Créer une boutique** directement, sans passer par l'inscription publique.
Elle démarre alors au statut ACTIF. Le mot de passe provisoire est affiché en
clair dans le formulaire, à communiquer au marchand.

**Suspendre / réactiver** en un clic. Une boutique suspendue n'est plus
indexée ; le reste du comportement est à définir avec les abonnements (phase 4).

**Journal** — `tondomaine.com/superadmin/journal`, les 200 dernières actions
sensibles.

---

## 5. « Se connecter » — l'impersonation

Depuis la liste, ce bouton ouvre le back-office du marchand avec les droits de
son administrateur. C'est l'outil de support : il évite de demander son mot de
passe à un client.

Comment ça marche, et pourquoi ainsi :

1. la console émet un jeton signé valable **60 secondes**
2. le navigateur est redirigé vers `boutique.tondomaine.com/api/impersonation`
3. ce point d'entrée vérifie le jeton, contrôle qu'il désigne **bien la
   boutique dont on visite le domaine**, puis pose la session

Le jeton transite par l'URL plutôt que par un cookie : un cookie posé sur le
domaine parent serait envoyé à *toutes* les boutiques, ce qu'on ne veut pas.

Deux garde-fous visibles :

- un **bandeau orange** en haut du back-office, pendant toute la session,
  indique qui est connecté et au nom de qui
- l'action est **inscrite au journal** avec l'agent, la boutique, l'horodatage
  et l'adresse IP

⚠️ Les actions faites pendant une impersonation sont enregistrées **au nom du
marchand** dans ses propres données — une vente créée apparaîtra comme
encaissée par son administrateur. Le journal de la console est le seul endroit
où l'on sait qu'un agent était derrière.

---

## 6. Vérifications

```bash
npm run lint
npx tsc --noEmit
npm run db:test-isolation
```

Typecheck et ESLint passent au vert sur cette phase.

À contrôler à la main, une fois en ligne :

- [ ] `/superadmin` sans être connecté renvoie bien vers la page de connexion
- [ ] `/superadmin` n'est **pas** accessible depuis un sous-domaine de boutique
- [ ] créer une boutique de test depuis `/inscription`, puis s'y connecter
- [ ] « Se connecter » affiche bien le bandeau orange
- [ ] l'action apparaît dans le journal avec la bonne IP

---

## 7. Ce qui reste

**Phase 4 — abonnements.** Plans, quotas, essai limité dans le temps,
facturation Djomy côté plateforme, suspension automatique pour impayé. Le
statut `ESSAI` n'expire pas encore : rien ne se passe au bout de X jours.

**Points connus :**

- pas de récupération de mot de passe en libre-service, ni pour les marchands
  ni pour la console — la réinitialisation passe par un administrateur ou par
  `npm run platform:user`
- pas de limite de tentatives de connexion
- la console n'a qu'un seul niveau de droits : tout agent peut tout faire
- le logo et les couleurs restent communs à toutes les boutiques
