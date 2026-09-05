@AGENTS.md

# Guygou — SaaS e-commerce multi-tenant

Plateforme boutique + back-office + caisse, louée à des marchands guinéens.
Née comme site unique de **Bilale et Danedjo Corporation SARLU** (Conakry),
convertie en SaaS multi-tenant. Bilale & Danedjo est aujourd'hui le tenant
n°1 : le code ne doit plus jamais supposer qu'il est le seul.

Le dépôt s'appelle encore `bilale_danedjo_corp`, les cookies encore `bdc_*` :
c'est de l'historique, pas une indication de périmètre.

**Langue** : tout le produit est en français — code, commentaires, routes
(`/produits`, `/commander`), libellés d'énums (`ESSAI`, `GERANT`,
`TENANT_SUSPENDU`), messages d'erreur, documentation. Écrire en français,
commentaires compris.

**Sauf les messages de commit**, qui sont en anglais dans tout l'historique
(`feat: multi-tenant SaaS platform with self-service subscriptions`,
`docs: state what production actually needs to run`). Conventional commits,
impératif, en anglais — suivre l'historique, pas la langue du code.

**Monnaie** : GNF, entiers, jamais de décimales. Formatage via `src/lib/format.ts`.

---

## Trois populations — ne jamais les confondre

| Terme | Qui | Où il se connecte | Cookie |
| ----- | --- | ----------------- | ------ |
| **Plateforme** | l'éditeur du SaaS (nous) | `/superadmin` sur le domaine racine — réécrit vers `/plateforme/superadmin` | `bdc_platform` |
| **Tenant** (marchand) | une entreprise abonnée | `/admin`, `/pos` sur son sous-domaine | `bdc_session` |
| **Client final** | l'acheteur du marchand | `/compte` sur le sous-domaine du marchand | `bdc_client` |

Le mot « client » est déjà pris par le modèle `Customer` (l'acheteur). Dans le
code, le marchand s'appelle **toujours `tenant`**, jamais « client ».

---

## Commandes

```bash
npm run dev                  # next dev
npm run build                # prisma generate && next build
npm run lint                 # eslint — doit être vert avant tout commit

npm run db:migrate:deploy    # prisma migrate deploy — LE chemin à utiliser
npm run db:migrate           # prisma migrate dev — ⚠️ CASSÉ, voir plus bas
npm run db:seed              # tenant « bilale » + comptes de départ
npm run db:studio            # prisma studio

npm run db:test-isolation    # aucune fuite entre tenants — le test qui compte
npm run verif:requetes       # angles morts de la garde — statique, sans base
npm run test:quotas
npm run test:securite
npm run test:blocks
npm run test:messages
npx tsx scripts/test-abonnement.mjs   # pas de script npm
npx tsx scripts/test-console.mjs      # pas de script npm

npm run platform:user        # crée un PlatformUser (accès /superadmin)
```

Deuxième boutique de test :

```bash
TENANT_SLUG=demo TENANT_NAME="Boutique de démonstration" npm run db:seed
```

⚠️ **`npm run db:push` est un piège sur ce projet.** Le schéma est passé sous
`prisma migrate` avec des migrations écrites à la main (voir
`prisma/migrations/`). `db push` proposerait de recréer les tables et
détruirait les données.

⚠️ **`npm run db:migrate` (`prisma migrate dev`) échoue — P3006.** L'historique
n'est pas rejouable depuis zéro : `20260811225612_mig2` (générée par Prisma)
et `20260811160000_plateforme` (écrite à la main, 8 minutes plus tard, avec un
timestamp antérieur) ajoutent toutes deux `Settings.slogan`. En base, l'ordre
d'application chronologique les rend compatibles ; la **base fantôme** de
`migrate dev` rejoue par ordre alphabétique du nom, donc `plateforme` crée la
colonne et `mig2` la redemande sans `IF NOT EXISTS`.

**Conséquence pratique : appliquer les migrations avec `db:migrate:deploy`**,
qui n'utilise pas de base fantôme. Écrire les migrations à la main, comme le
reste de l'historique. Diagnostic à jour :
`node scripts/diagnostic-migrations.mjs` (lecture seule, sûr en production).

⚠️ **Le `DATABASE_URL` du `.env` pointe la base de production.** Ne jamais
lancer `migrate dev` ni `db push` dessus : tous deux savent proposer une
réinitialisation. Travailler sur une branche Neon.

⚠️ **`npm run build` échoue si `npm run dev` tourne** : le serveur de dev
verrouille la DLL du moteur Prisma sous Windows. Arrêter le dev d'abord.

---

## L'invariant central : l'isolation par tenant

Une seule base, une colonne `tenantId` sur chaque table métier, et une garde
applicative dans Prisma. **Une seule requête non filtrée suffit à faire fuiter
les données d'un marchand chez un autre.** C'est le risque n°1 du produit.

### La règle

```ts
import { db } from "@/lib/tenant-db";

const prisma = await db();              // client déjà filtré sur le tenant du host
const produits = await prisma.product.findMany();   // tenantId injecté
```

- `db()` — client du tenant de la requête courante. **C'est le défaut.**
- `tenantDb(id)` — client d'un tenant explicite (tâches planifiées, scripts).
- `platformDb` (`src/lib/db.ts`) — client **brut, sans aucun filtre**.

`platformDb` est interdit par une règle ESLint `no-restricted-imports`, sauf
dans la liste blanche `PLATFORM_DB_ALLOWED` de `eslint.config.mjs` (résolution
du tenant, tables de plateforme, console super-admin, scripts). **Ne pas
ajouter un chemin à cette liste pour faire taire l'erreur** — c'est le seul
garde-fou structurel du projet. Si un fichier métier a besoin de `platformDb`,
c'est presque toujours qu'il devrait utiliser `db()`.

Aujourd'hui : 50 fichiers passent par `@/lib/tenant-db`, 28 touchent
`platformDb` — ce second nombre ne doit pas monter sans raison écrite.

`PLATFORM_DB_ALLOWED` contient une entrée morte, `src/app/superadmin/**` : ce
répertoire n'existe pas, la console vit sous `src/app/plateforme/superadmin/`.
À supprimer, mais surtout à ne pas prendre pour un chemin valide.

### Modèles portés par la garde

`TENANT_SCOPED` dans `src/lib/tenant-db.ts` : `User`, `Category`, `Product`,
`Customer`, `Sale`, `SaleItem`, `StockMovement`, `Payment`, `Counter`,
`Document`, `DocumentItem`, `DocumentPayment`, `DeliveryZone`, `Order`,
`OrderItem`, `Settings`.

**Ajouter un modèle métier au schéma implique de l'ajouter à ce Set.** Un
modèle oublié n'est filtré par rien et l'oubli est silencieux.

Hors garde, par nature : `Tenant`, `TenantDomain`, `Plan`, `Subscription`,
`SubscriptionInvoice`, `PlatformUser`, `PlatformCounter`, `AuditLog`,
`AuthAttempt`, `VerificationToken`.

### Ce que la garde ne couvre pas

Ces deux angles morts sont désormais détectés par `npm run verif:requetes`,
qui dérive la liste des champs composites du schéma lui-même.

- **`$queryRaw`** — la garde ne voit pas le SQL brut. Ajouter à la main
  `AND "tenantId" = ${tenantId}`. Quatre occurrences, à connaître :
  `src/app/admin/page.tsx`, `src/app/admin/rapports/page.tsx` (×2),
  `src/app/admin/stock/page.tsx`.
- **Contraintes uniques** — toutes sont composites (`@@unique([tenantId, …])`).
  Deux marchands doivent pouvoir avoir le même SKU. Ne jamais recréer une
  contrainte unique globale sur une table métier.
- **Numérotation** — jamais d'`autoincrement` sur un numéro visible par le
  marchand. Passer par `nextCounter(tx, tenantId, key)` de
  `src/lib/counters.ts`. Clés : `SALE-2026`, `FACTURE-2026`, `PROFORMA-2026`,
  `BON_LIVRAISON-2026`, `ORDER-2026`.

### Le test qui tranche

`npm run db:test-isolation`. Toute modification touchant Prisma, le schéma ou
un `where` doit le laisser vert.

---

## Résolution du tenant

`src/proxy.ts` (Next.js 16 : `middleware` s'appelle désormais `proxy`) tourne
sur l'edge et **ne peut pas interroger la base**. Il fait quatre choses :
en-têtes de sécurité + nonce CSP, transmission du host en `x-tenant-host`,
réécriture du domaine racine vers `/plateforme`, protection de `/admin`, `/pos`
et `/login`.

La traduction host → `tenantId` se fait côté serveur dans `src/lib/tenant.ts`,
mise en cache par requête via `React.cache` :

- `classifyHost()` — analyse purement textuelle : `platform` | `subdomain` | `custom`
- `getTenant()` — le tenant, ou `null` sur la zone plateforme
- `requireTenant()` — le tenant, ou `notFound()`

| Adresse | Ce qui s'affiche |
| ------- | ---------------- |
| `guygou.com` | vitrine de la plateforme (réécriture interne vers `/plateforme`) |
| `bilale.guygou.com` | boutique + back-office + caisse du marchand |
| `maboutique.com` | même boutique, via `TenantDomain` vérifié |
| autre chose | « cette boutique n'existe pas » |

Sous-domaines réservés : liste `RESERVED` dans `src/lib/tenant.ts`
(`www`, `app`, `api`, `admin`, `superadmin`, `mail`…).

**Règle de session non négociable** : le `tenantSlug` du jeton doit
correspondre au host. Le proxy rejette une session valide émise sur une autre
boutique et supprime le cookie. Ne pas assouplir cette vérification.

En développement : `NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"`, puis
`bilale.localhost:3000`. Si le navigateur ne résout pas, `bilale.lvh.me:3000`.

---

## Abonnements, quotas, suspension

Deux flux de paiement à ne jamais mélanger :

1. **Encaissement du marchand** — chaque tenant branche **ses** clés Djomy,
   chiffrées AES-256-GCM avec `TENANT_SECRET_KEY` (`src/lib/crypto.ts`,
   `src/lib/payment/tenant-djomy.ts`). Webhook propre à chaque boutique :
   `/api/paiement/djomy/[tenantId]` — nécessaire, car la signature dépend du
   secret du tenant, donc il faut savoir *qui* avant de pouvoir vérifier.
2. **Abonnement au SaaS** — la plateforme encaisse avec **ses** clés
   (`DJOMY_CLIENT_ID` / `DJOMY_CLIENT_SECRET`). `src/lib/billing.ts`,
   webhook `/api/abonnement/djomy`.

Le cycle tourne par cron Vercel : `/api/abonnement/cycle`, tous les jours à
06:00 UTC (`vercel.json`), protégé par `CRON_SECRET`. **Sans ce secret en
production, la route refuse de s'exécuter** : aucune facture, aucune
suspension. Échec silencieux à connaître.

Constantes dans `src/lib/plans.ts` : `TRIAL_DAYS` 14, `GRACE_DAYS` 7,
`INVOICE_LEAD_DAYS` 3, `PERIOD_DAYS` 30.

Djomy n'expose ni mandat ni tokenisation : le renouvellement est **assisté**
(lien envoyé à échéance, validé par le marchand), pas un prélèvement
automatique. Ne pas promettre le contraire dans l'interface.

### Deux suspensions distinctes

- **Impayé** (`Subscription.status`) — la vitrine publique ferme, **la caisse
  et le back-office restent ouverts**. On ne coupe pas l'outil de travail de
  quelqu'un à qui on réclame de l'argent. Voir `isShopClosed()`,
  `isBackOfficeOpen()`, `isAdminPathOpenWhenUnpaid()`.
- **Suspension plateforme** (`Tenant.status = SUSPENDU`) — décidée à la main
  pour motif grave. Ferme **tout**. Voir `isTenantSuspended()`.

Quotas : `checkQuota()` dans `plans.ts`, `productQuota()` / `userQuota()` /
`featureGate()` dans `subscription.ts`. Fonctionnalités : `shop`, `invoicing`,
`domain`.

---

## Rôles

`ADMIN` > `GERANT` > `CAISSIER`, comparés par `hasRole(role, minimum)`
(`src/lib/session.ts`, utilisable sur l'edge) et imposés côté page par
`requireRole()` (`src/lib/auth.ts`). Le proxy exige `GERANT` minimum sur
`/admin` ; `/admin/utilisateurs` et `/admin/parametres` appellent en plus
`requireRole("ADMIN")` ; `/pos` est ouvert dès `CAISSIER`.
Mots de passe bcrypt, jetons JWT HS256 signés avec `jose`, cookies httpOnly.

---

## Carte du code

```
src/proxy.ts                  sécurité, host, réécriture, protection des routes

src/lib/
  db.ts                       platformDb — brut, usage restreint
  tenant-db.ts                db() / tenantDb() — LE point d'entrée Prisma
  tenant.ts                   classifyHost, getTenant, requireTenant, RESERVED
  counters.ts                 nextCounter — numérotation par tenant
  crypto.ts                   chiffrement des clés Djomy des marchands
  session.ts                  JWT, cookies, hasRole (compatible edge)
  auth.ts / shop-auth.ts      sessions personnel / clients finaux
  platform-auth.ts            sessions PlatformUser
  plans.ts                    constantes d'abonnement, quotas, statuts
  subscription.ts             abonnement du tenant courant, feature gates
  billing.ts                  émission de factures, liens de paiement, cycle
  provisioning.ts             création d'un tenant complet en une transaction
  domains.ts                  domaines personnalisés, vérification DNS, Vercel
  theme.ts / brand.ts         couleurs et logo par boutique
  blocks.ts / home-draft.ts   contenu éditable de la page d'accueil
  storage.ts                  S3 / R2 — images des marchands
  security-headers.ts         CSP, nonce, en-têtes
  throttle.ts                 limitation des tentatives de connexion
  messaging/                  emails transactionnels (Resend)
  payment/djomy.ts            Djomy plateforme
  payment/tenant-djomy.ts     Djomy du marchand
  documents.ts orders.ts      facturation, commandes
  settings.ts catalog.ts format.ts site.ts products.ts

src/app/
  (site)/                     vitrine + boutique du marchand
  admin/                      back-office du marchand
  pos/                        caisse
  plateforme/                 vitrine SaaS, /inscription, /superadmin
  api/paiement/djomy/[tenantId]/    webhook d'encaissement marchand
  api/abonnement/djomy/            webhook d'abonnement plateforme
  api/abonnement/cycle/            cron de facturation
  api/impersonation/               « connexion en tant que » (audité)
```

---

## Dettes et pièges connus

**`typescript: { ignoreBuildErrors: true }` dans `next.config.ts`.** 45 erreurs
sur la couture du garde multi-tenant : `tenantDb()` injecte `tenantId` à
l'exécution, mais les types générés par Prisma continuent de l'exiger des
appelants. Conséquence : **aucune** erreur de type n'arrête un déploiement, y
compris les vraies. `npx tsc --noEmit` ne passe pas — ce rouge est connu, ce
n'est pas une régression, et il ne faut pas s'y habituer. Le correctif propre
est de typer le client restreint, pas d'ajouter des `any`.

**Un bouton `name="id"` ne transmet rien à une Server Action.** React 19
n'inclut pas le `name`/`value` du bouton de soumission dans le `FormData` d'une
action déclenchée par `formAction` — vérifié à l'exécution. `formData.get("id")`
y vaut toujours `null`, l'action sort en silence, et le bouton semble mort sans
la moindre erreur. Passer l'identifiant par `action.bind(null, id)`, avec une
signature `(id: string, _formData: FormData)`. Les champs du formulaire, eux,
sont transmis normalement : `formData.getAll("ids")` fonctionne. Motif en place
dans `src/app/admin/produits/page.tsx`.

**Aucune page publique n'est mise en cache statiquement** — la lecture des
en-têtes force le rendu dynamique. Pas de fuite de cache entre marchands, mais
pas de cache non plus. Quand le trafic le justifiera : `revalidateTag` avec des
étiquettes préfixées par le tenant. Ne jamais utiliser un
`revalidatePath("/produits")` global : il invaliderait toutes les boutiques.

**Encore commun à toutes les boutiques** : les horaires d'ouverture et les
textes du bandeau d'accueil (`Hero.tsx`, mention « Conakry ») sont dans
`src/lib/site.ts` ou écrits en dur. Le slogan et le numéro WhatsApp, eux,
viennent bien des réglages.

**`src/lib/site.ts` et `src/lib/products.ts`** sont des reliques du site
mono-entreprise, gardées comme repli statique. Ne pas y ajouter de données
métier : la source de vérité est la base, par tenant.

**Perdre `TENANT_SECRET_KEY` rend illisibles toutes les clés de paiement des
marchands.** Elle doit être sauvegardée ailleurs que sur le serveur.

**Branche courante : `feat/saas-multitenant`, rien n'est fusionné dans `main`.**

---

## Variables d'environnement

Bloquantes : `DATABASE_URL` (URL poolée Neon), `DIRECT_URL` (non poolée, joue
les migrations), `SESSION_SECRET` (32 car. min), `TENANT_SECRET_KEY` (32 car.
min), `NEXT_PUBLIC_ROOT_DOMAIN`.

Fonction manquante en silence si absentes : `CRON_SECRET` (facturation),
`DJOMY_CLIENT_ID` / `DJOMY_CLIENT_SECRET` (paiement d'abonnement),
`RESEND_API_KEY` / `MAIL_FROM` (mots de passe oubliés, rappels),
`S3_*` (téléversement d'images), `SIGNUP_ALERT_EMAIL`.

Facultatives : `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`
(rattachement automatique des domaines), `CSP_REPORT_ONLY=1`.

Détail complet : `DEPLOIEMENT-SAAS.md` §3.

---

## Avant de commiter

1. `npm run lint` vert — l'erreur `platformDb` n'est pas négociable
2. `npm run verif:requetes` vert — `tsc` ne protège de rien tant que
   `ignoreBuildErrors` est là ; c'est ce script qui attrape les `findUnique`
   sur champ composite et le SQL brut sans `tenantId`
3. `npm run db:test-isolation` vert si le schéma ou une requête a bougé
4. `npm run build` (dev arrêté)
5. Message de commit en anglais, conventional commits, comme l'historique

---

## Documentation du dépôt

Ces fichiers sont la mémoire du projet — les lire avant de rouvrir un sujet,
et les mettre à jour quand le comportement change.

| Fichier | Sujet |
| ------- | ----- |
| `README.md` | vue d'ensemble, routes, stack |
| `DEMARRAGE.md` | mise en route locale |
| `ARCHITECTURE-SAAS.md` | plan multi-tenant, décisions, phases |
| `MIGRATION-MULTITENANT.md` | migration des données existantes |
| `DEPLOIEMENT-SAAS.md` | DNS, Vercel, variables, checklist de mise en ligne |
| `CONSOLE.md`, `CONSOLE-PLATEFORME.md` | console super-admin |
| `ABONNEMENTS.md`, `QUOTAS.md`, `REABONNEMENT.md` | commercial et facturation |
| `ONBOARDING.md` | inscription d'un marchand |
| `APPARENCE.md`, `PERSONNALISATION.md` | thème, logo, contenu par boutique |
| `INTEGRATION-META.md` | cadrage de la connexion Meta Business (catalogue) — **non commencé**, phase 0 de faisabilité à trancher d'abord |
| `EMAILS.md` | emails transactionnels |
| `SECURITE.md` | CSP, sessions, limitation de connexion |
