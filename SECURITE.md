# Sécurité

Ce document couvre les deux protections ajoutées après l'audit initial : la
limitation des tentatives de connexion et les en-têtes de sécurité HTTP. Il
signale aussi, en fin de page, ce qui reste ouvert.

---

## 1. Mise en route

```bash
npm run db:migrate:deploy
npx prisma generate
```

Une seule variable nouvelle, facultative, dans `.env` :

```
CSP_REPORT_ONLY="1"
```

**À mettre à `1` pour la première mise en ligne.** La politique de sécurité est
alors annoncée au navigateur sans rien bloquer : les infractions apparaissent
dans la console, les pages continuent de fonctionner. Une fois le tour du
propriétaire fait, vider la variable pour activer le blocage.

---

## 2. Limitation des tentatives de connexion

### Le problème

Rien n'empêchait d'essayer des mots de passe en boucle. Deux attaques
distinctes en découlaient :

- **la devinette en ligne** — des milliers de mots de passe sur un compte
  connu ;
- **le bourrage d'identifiants** — un seul mot de passe, tiré d'une fuite
  ailleurs, essayé sur des milliers de comptes. Cette seconde attaque ne
  déclenche jamais un compteur par compte, puisqu'elle n'essaie qu'une fois
  par compte.

D'où deux compteurs indépendants à chaque connexion.

### Les seuils

| Compteur | Seuil | Verrou | Plafond |
| --- | --- | --- | --- |
| Par compte | 8 échecs / 15 min | 15 min | 60 min |
| Par adresse IP | 30 échecs / 15 min | 30 min | 120 min |
| Création de boutique | 5 / heure | 60 min | 240 min |

Chaque verrou suivant double, jusqu'au plafond. Une connexion réussie efface
les compteurs — sans quoi huit fautes de frappe étalées sur la journée
finiraient par enfermer dehors un marchand parfaitement légitime.

**Pourquoi le compteur par compte est plus indulgent que celui par adresse :**
n'importe qui peut verrouiller le compte d'un tiers en s'y trompant exprès.
Le compteur par adresse, lui, ne gêne que celui qui insiste. Ce compromis est
inhérent au verrouillage par compte ; on l'atténue par des durées modérées.

### Les détails qui comptent

**Le compteur est vérifié avant bcrypt.** C'est le calcul du hachage qui coûte
cher — quelques dizaines de millisecondes de processeur par tentative. Le
placer après aurait laissé intacte la possibilité d'épuiser le serveur.

**Les compteurs sont propres à chaque boutique.** Un attaquant qui s'acharne
sur `boutique-a` ne verrouille pas le même email sur `boutique-b`.

**Les clés sont des HMAC, jamais des emails ou des IP en clair.** La table
n'a pas besoin d'être lisible, seulement comparable. Un HMAC et non un simple
hachage : sinon une copie de la base permettrait de tester une liste
d'adresses connues.

**Une base indisponible laisse passer.** Si le compteur ne peut pas être lu,
on n'enferme pas tout le monde dehors — le mot de passe reste vérifié juste
après, et c'est lui la vraie porte.

**Le nettoyage est opportuniste**, environ une fois sur cinquante. Pas de
tâche planifiée à surveiller pour une table de cette taille.

### Ce que ça ne fait pas

Cela repousse la devinette en ligne et le bourrage d'identifiants. Cela ne
protège **pas** d'un mot de passe faible, ni d'une attaque répartie sur des
milliers d'adresses. Avec ces seuils, un attaquant obstiné dispose encore de
plusieurs dizaines d'essais par heure et par compte. La solidité des mots de
passe reste la défense principale.

---

## 3. En-têtes de sécurité HTTP

Posés par `src/proxy.ts` sur **toutes** les réponses, y compris les
redirections et les réécritures — c'est le piège classique, une redirection
sans en-têtes annule la protection sur la page d'où l'on vient.

| En-tête | Rôle |
| --- | --- |
| `Content-Security-Policy` | Voir ci-dessous |
| `X-Content-Type-Options: nosniff` | Un fichier envoyé par un marchand ne peut pas être réinterprété comme du HTML |
| `X-Frame-Options: DENY` | Doublon de `frame-ancestors` pour les navigateurs anciens |
| `Referrer-Policy` | L'adresse complète d'une page d'administration ne part pas chez un tiers |
| `Permissions-Policy` | Caméra, micro, géolocalisation, paiement : tout refusé, rien n'en utilise |
| `Cross-Origin-Opener-Policy` | Isole la fenêtre des pages ouvertes depuis la nôtre |
| `Strict-Transport-Security` | Deux ans, sous-domaines compris. **Production uniquement** |

`Strict-Transport-Security` est absent en développement à dessein : sur
`localhost`, il forcerait le navigateur à passer en HTTPS pendant des mois, y
compris pour les autres projets servis depuis la même adresse. `preload` n'est
pas demandé non plus — l'inscription sur la liste des navigateurs est très
difficile à défaire.

### La politique de sécurité du contenu

Le point important est `script-src` : **un nonce par requête plus
`strict-dynamic`, sans `unsafe-inline`.** Un script injecté dans une page —
par une faille d'affichage — devrait deviner un jeton aléatoire de 128 bits
pour s'exécuter. Next relit le nonce dans l'en-tête et l'applique lui-même à
ses balises.

Les autres directives dures : `form-action 'self'` (un formulaire ne peut pas
poster ailleurs), `base-uri 'self'`, `object-src 'none'`.

### `frame-ancestors` : deux régimes

L'aperçu de l'éditeur affiche la vitrine dans un cadre. Il a donc fallu
assouplir la protection anti-encadrement — mais **seulement là où c'était
nécessaire** :

| Pages | `frame-ancestors` | `X-Frame-Options` |
| --- | --- | --- |
| Vitrine (`/`, `/produits`, `/contact`…) | `'self'` | `SAMEORIGIN` |
| `/admin`, `/pos`, `/login`, `/plateforme` | `'none'` | `DENY` |

Ce qui compte n'a pas bougé : **une origine étrangère reste refusée dans les
deux cas.** Un site malveillant ne peut toujours pas encadrer la boutique pour
faire cliquer « Payer » à l'insu du visiteur. Seule une page de la boutique
elle-même le peut désormais — et les écrans qui portent les boutons dangereux,
eux, restent totalement inencadrables.

Le partage se fait sur le chemin, dans `isFramableBySelf()`, et il est couvert
par les tests : si quelqu'un ajoute un jour un écran d'administration sous un
autre préfixe, le test qui vérifie `/admin`, `/pos` et `/login` ne le
signalera pas. C'est la limite connue de cette approche.

**`style-src` conserve `unsafe-inline`, et c'est un compromis assumé.** Un
nonce ne peut pas s'appliquer à un attribut `style="…"`, or l'application en
produit à chaque animation. Interdire l'inline casserait la vitrine sans
apporter grand-chose : une feuille de style injectée permet de défigurer une
page, pas d'exécuter du code.

Deux entrées méritent d'être connues, parce qu'elles cassent des
fonctionnalités si on les retire :

- `connect-src` doit contenir **l'API du bucket** (`S3_ENDPOINT`), pas
  seulement son domaine public : le navigateur envoie les photos directement
  au stockage. Sans cette entrée, tout téléversement échoue avec une erreur
  réseau opaque.
- `frame-src` autorise `maps.google.com` pour la carte de la page Contact.

Tests : `npm run test:securite` — 40 vérifications. Elles existent surtout
pour empêcher un affaiblissement discret : un `unsafe-inline` ajouté un jour
dans `script-src` pour débloquer une page annulerait l'essentiel de la
protection, et rien d'autre ne le signalerait.

---

## 4. Ce qui a été vérifié

Typecheck et ESLint au vert. `npm run test:securite` : 40 vérifications sur
les fonctions pures.

**Vérifié en direct dans un navigateur**, sur le serveur de développement :

| | |
| --- | --- |
| En-têtes servis | Les sept sont présents, avec les bonnes valeurs |
| Nonces | 42 balises `<script>` sur 45 en portent un |
| Les 3 restantes | Client HMR de Turbopack et script d'extension — chargés dynamiquement par un script de confiance, donc couverts par `strict-dynamic` |
| Hydratation React | Effective — les bundles s'exécutent, `strict-dynamic` fonctionne |
| Carte de la page Contact | L'iframe `maps.google.com` se charge |
| Pages parcourues | Accueil plateforme, vitrine, Contact, panier, connexion, back-office, éditeur de page d'accueil, **caisse** |
| Infractions CSP en console | Aucune |

La seule erreur de console rencontrée vient de l'extension du navigateur
elle-même, qui ajoute un attribut au `<html>` avant que React n'hydrate. Elle
existait déjà avant ces modifications.

### Ce qui reste à contrôler

**Le téléversement d'images n'a pas pu être testé** : le stockage n'est pas
configuré en développement. C'est le point le plus susceptible d'être bloqué,
parce que le navigateur envoie directement au bucket. À vérifier en premier
après la mise en ligne.

**Le mode production n'a pas été observé** — il retire `unsafe-eval`, ajoute
`upgrade-insecure-requests` et HSTS. C'est pour cela que `CSP_REPORT_ONLY`
existe : mettre la variable à `1` au premier déploiement, parcourir le site,
puis la vider.

Une infraction se lit ainsi dans la console : *« Refused to … because it
violates the following Content Security Policy directive: … »* — la directive
nommée à la fin est celle à compléter dans `src/lib/security-headers.ts`.

Reste aussi :

- [ ] parcours de paiement complet, jusqu'au retour depuis Djomy
- [ ] impression d'une facture
- [ ] huit mots de passe faux d'affilée verrouillent bien le compte
- [ ] une connexion réussie remet le compteur à zéro
- [ ] derrière l'hébergeur, `x-forwarded-for` contient bien l'adresse du
      visiteur et non celle du proxy — sinon le compteur par IP compte tout
      le monde ensemble et verrouille tout le monde d'un coup

---

## 5. Ce qui reste ouvert

**La reprise de compte client est corrigée.** Elle est décrite au §7 de
`EMAILS.md` : l'inscription ne rattache plus un compte existant sans preuve,
et le rapprochement par téléphone a été supprimé.

Restent ouverts :

- **Pas de supervision** — une erreur en production n'est signalée par rien.
- **Un changement de mot de passe ne déconnecte pas les sessions ouvertes** —
  voir `EMAILS.md` §3 pour la raison et le coût de la correction.
- **Le titulaire n'est pas prévenu** quand son mot de passe change, alors que
  c'est le signal le plus simple pour repérer une prise de contrôle.
- **Pas de second facteur** sur les comptes de la plateforme, qui ouvrent
  pourtant la console de toutes les boutiques.
- **Pas de politique de mot de passe** au-delà des 8 caractères minimum.
- **Pas de journalisation des connexions réussies** — seules les actions
  sensibles de la console sont tracées.
