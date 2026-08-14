# Passage en SaaS multi-tenant — plan d'architecture

Document de cadrage. À valider avant d'écrire la moindre ligne de code.

**Décisions prises**

| Sujet | Choix |
| ----- | ----- |
| Adressage | Sous-domaine par boutique + domaine personnalisé optionnel |
| Isolation | Une base, colonne `tenantId` partout, garde applicative Prisma |
| Commercial | Plans avec quotas + paiement de l'abonnement via Djomy |
| Méthode | Plan d'abord, puis exécution par phases |

**Point de départ** — 103 fichiers TypeScript, 41 touchent Prisma, 14 modèles
de données, 4 requêtes SQL brutes. Tout est aujourd'hui écrit pour une seule
entreprise.

---

## 1. Vocabulaire

Trois populations distinctes, à ne jamais confondre :

| Terme | Qui | Où il se connecte |
| ----- | --- | ----------------- |
| **Plateforme** | Toi, l'éditeur du SaaS | `/superadmin` sur le domaine racine |
| **Tenant** (marchand) | Une entreprise abonnée — Bilale & Danedjo en est une | `/admin` et `/pos` sur son sous-domaine |
| **Client final** | L'acheteur du marchand | `/compte` sur le sous-domaine du marchand |

Le mot « client » est déjà pris par le modèle `Customer` (acheteur). Dans le
code, le marchand s'appelle toujours **tenant**, jamais « client ».

---

## 2. Adressage

### Schéma retenu

```
tondomaine.com                 → site vitrine du SaaS + inscription
app.tondomaine.com             → console plateforme (/superadmin)
bilale.tondomaine.com          → boutique + back-office du tenant « bilale »
bilale-danedjo.com             → domaine personnalisé pointant sur le même tenant
```

### Résolution

`src/proxy.ts` (déjà en place pour l'authentification) devient aussi le point
de résolution du tenant :

1. lecture de l'en-tête `Host`
2. si le host correspond au domaine racine ou à `app.` → zone plateforme
3. sinon, extraction du sous-domaine, ou recherche du host dans la table
   `TenantDomain`
4. le `tenantId` résolu est posé dans un en-tête interne `x-tenant-id`, que les
   Server Components et Server Actions relisent via `headers()`
5. host inconnu → page « boutique introuvable », jamais un fallback silencieux
   sur un tenant existant

Le proxy tourne sur l'edge : il ne peut pas interroger Prisma. Deux options,
la seconde est celle que je recommande :

- appel à une route interne `/api/interne/resolve-tenant` depuis le proxy —
  simple mais ajoute une latence à chaque requête
- **résolution paresseuse** : le proxy se contente d'extraire le sous-domaine
  (opération purement textuelle) et le passe en en-tête ; la traduction en
  `tenantId` se fait dans une fonction serveur `getTenant()` mise en cache par
  requête avec `React.cache`. Les domaines personnalisés, minoritaires, font
  une lecture en base — cachée elle aussi.

### Domaines personnalisés

Modèle `TenantDomain` : `host`, `tenantId`, `verified`, `verificationToken`.
Le marchand ajoute son domaine, on lui affiche un enregistrement `CNAME` et un
`TXT` de vérification. Tant que `verified` est faux, le domaine ne résout pas.

Côté Vercel, chaque domaine personnalisé doit être ajouté au projet — via
l'API Vercel Domains, appelée depuis la console plateforme. C'est la partie la
plus fastidieuse ; elle peut arriver en phase 2 sans bloquer le reste.

### En développement

Les sous-domaines de `localhost` fonctionnent dans Chrome et Firefox :
`bilale.localhost:3000`. Alternative universelle : `lvh.me`, qui résout vers
127.0.0.1 (`bilale.lvh.me:3000`).

---

## 3. Isolation des données

### Principe

Chaque table métier reçoit une colonne `tenantId` non nulle, indexée. Aucune
requête applicative n'utilise le client Prisma brut : tout passe par un client
**dérivé et pré-filtré**.

```ts
// src/lib/tenant-db.ts (esquisse)
export function tenantDb(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) return query(args);

          if (operation === "create") {
            args.data = { ...args.data, tenantId };
          } else if (operation === "createMany") {
            args.data = toArray(args.data).map((d) => ({ ...d, tenantId }));
          } else if (operation === "upsert") {
            args.create = { ...args.create, tenantId };
            args.where = { ...args.where, tenantId };
          } else if ("where" in args) {
            args.where = { ...args.where, tenantId };
          }

          return query(args);
        },
      },
    },
  });
}
```

Le client brut `prisma` est renommé `platformDb` et réservé à trois usages :
résolution du tenant, tables de plateforme, console super-admin. Une règle
ESLint interdit son import ailleurs — c'est ce garde-fou qui rend l'approche
tenable sur la durée.

### Ce que la garde ne couvre pas

Trois angles morts, à traiter à la main :

1. **`findUnique` sur un champ unique global.** `findUnique({ where: { id } })`
   n'accepte pas de `tenantId` supplémentaire tant que la contrainte n'est pas
   composite. Conversion systématique en `findFirst({ where: { id, tenantId } })`.
   C'est le point qui touche le plus de fichiers : 14 occurrences pour
   `customer`, 10 pour `document`, 6 pour `order`.
2. **Les 4 requêtes `$queryRaw`** (tableau de bord, rapports, stock) : ajout
   manuel de `AND "tenantId" = ${tenantId}`. Elles sont paramétrées, donc sûres,
   mais la garde ne les voit pas.
3. **Les agrégations `groupBy`** : couvertes par la garde via `where`, mais à
   revérifier une par une car un `groupBy` sans `where` est fréquent.

### Contraintes uniques à reprendre

Toutes les contraintes actuelles sont globales et deviendraient fausses : deux
marchands doivent pouvoir avoir un produit `riz-parfume-25kg`.

| Modèle | Aujourd'hui | Cible |
| ------ | ----------- | ----- |
| `User` | `email` unique | `@@unique([tenantId, email])` |
| `Category` | `key` unique | `@@unique([tenantId, key])` |
| `Product` | `sku` unique | `@@unique([tenantId, sku])` |
| `Customer` | `phone`, `email` uniques | `@@unique([tenantId, phone])`, `@@unique([tenantId, email])` |
| `Sale` | `number` **autoincrement** unique | `Int` alimenté par compteur + `@@unique([tenantId, number])` |
| `Document` | `reference` unique, `[type, year, number]` | `@@unique([tenantId, reference])`, `@@unique([tenantId, type, year, number])` |
| `Order` | `reference` unique, `[year, number]` | `@@unique([tenantId, reference])`, `@@unique([tenantId, year, number])` |
| `Counter` | `key` en clé primaire | `@@id([tenantId, key])` |
| `Settings` | ligne unique `id = "default"` | `tenantId` en clé primaire, une ligne par tenant |

⚠️ **Le numéro de ticket de caisse est le seul vrai piège.** Il repose
aujourd'hui sur une séquence PostgreSQL globale (`autoincrement`). En
multi-tenant, les tickets de deux marchands se mélangeraient dans la même
numérotation. Il faut basculer sur le mécanisme `Counter` déjà utilisé pour les
factures et commandes — donc modifier le chemin d'encaissement, qui est le plus
critique du produit.

### Pourquoi pas RLS PostgreSQL

Tu as retenu la garde applicative. Sache que la porte reste ouverte : les
politiques RLS pourront être ajoutées plus tard **par-dessus** ce schéma, sans
rien changer au code, en posant `SET LOCAL app.tenant_id` à chaque connexion.
C'est le filet de sécurité à envisager quand les premiers vrais clients
arriveront.

---

## 4. Nouveaux modèles

```prisma
model Tenant {
  id        String   @id @default(cuid())
  slug      String   @unique          // « bilale » → bilale.tondomaine.com
  name      String
  status    TenantStatus @default(ESSAI)
  createdAt DateTime @default(now())

  // Encaissement du marchand — clés chiffrées au repos
  djomyClientId     String?
  djomyClientSecret String?           // chiffré AES-256-GCM
  djomyEnabled      Boolean @default(false)

  domains       TenantDomain[]
  subscription  Subscription?
  // + relation inverse vers tous les modèles métier
}

enum TenantStatus { ESSAI ACTIF SUSPENDU RESILIE }

model TenantDomain {
  id                String  @id @default(cuid())
  host              String  @unique   // bilale-danedjo.com
  tenantId          String
  verified          Boolean @default(false)
  verificationToken String
  isPrimary         Boolean @default(false)
}

model Plan {
  id            String  @id @default(cuid())
  code          String  @unique       // essai, standard, pro
  name          String
  priceMonthly  Int                   // GNF
  maxProducts   Int                   // 0 = illimité
  maxUsers      Int
  maxOrdersMonth Int
  features      Json                  // { pos: true, facturation: true, boutique: true }
  active        Boolean @default(true)
}

model Subscription {
  id               String @id @default(cuid())
  tenantId         String @unique
  planId           String
  status           SubscriptionStatus @default(ESSAI)
  trialEndsAt      DateTime?
  currentPeriodEnd DateTime
  invoices         SubscriptionInvoice[]
}

enum SubscriptionStatus { ESSAI ACTIF IMPAYE SUSPENDU RESILIE }

model SubscriptionInvoice {
  id             String @id @default(cuid())
  subscriptionId String
  amount         Int
  periodStart    DateTime
  periodEnd      DateTime
  status         String            // EN_ATTENTE, PAYEE, ECHOUEE
  djomyReference String?
  paidAt         DateTime?
}

model PlatformUser {          // toi et ton équipe, séparés des User marchands
  id           String @id @default(cuid())
  email        String @unique
  name         String
  passwordHash String
  active       Boolean @default(true)
}
```

---

## 5. Authentification

Trois périmètres de session, trois cookies distincts :

| Cookie | Porte | Contenu du jeton |
| ------ | ----- | ---------------- |
| `bdc_platform` | `/superadmin` | `sub`, `scope: "platform"` |
| `bdc_session` | `/admin`, `/pos` | `sub`, `role`, **`tenantId`** |
| `bdc_client` | `/compte` | `sub`, **`tenantId`**, `scope: "shop"` |

La règle non négociable : **le `tenantId` du jeton doit correspondre au tenant
résolu par le host**. Un jeton valide émis sur `bilale.tondomaine.com` doit
être rejeté sur `autre.tondomaine.com`. C'est la vérification qui empêche le
scénario d'attaque le plus évident.

Les mots de passe restent hachés en bcrypt, les jetons signés en HS256 avec
`jose` — rien à changer sur ce plan.

Le panier `localStorage` doit être préfixé par le tenant (`bdc_panier_v1` →
`bdc_panier_v1_<slug>`), sinon un même navigateur mélangerait les paniers de
deux boutiques.

---

## 6. Paiements — deux flux à ne pas confondre

### Encaissement du marchand

Chaque tenant branche **ses propres** clés Djomy pour encaisser ses commandes.
Elles sont stockées chiffrées (AES-256-GCM, clé maître `TENANT_SECRET_KEY` en
variable d'environnement) et déchiffrées uniquement au moment de l'appel.

Conséquence sur le webhook : la signature dépend du `clientSecret` du tenant,
donc **il faut savoir de quel tenant vient l'appel avant de pouvoir vérifier la
signature**. L'URL de webhook devient donc propre à chaque tenant :

```
/api/paiement/djomy/<tenantId>
```

C'est cette URL que le marchand déclare dans son espace Djomy. Sans cela, on
serait obligé d'essayer toutes les clés jusqu'à ce qu'une signature tombe
juste — inacceptable.

### Abonnement au SaaS

La plateforme encaisse avec **ses** clés Djomy (variables d'environnement
globales, comme aujourd'hui). Flux :

1. J-3 avant `currentPeriodEnd`, une tâche planifiée crée une
   `SubscriptionInvoice` et un lien de paiement Djomy
2. le marchand reçoit le lien (SMS via Djomy, plus email si tu en ajoutes un)
3. le webhook plateforme encaisse et repousse `currentPeriodEnd` d'un mois
4. sans paiement à échéance : `IMPAYE`, bandeau d'avertissement dans le
   back-office ; après un délai de grâce à définir, `SUSPENDU` — la boutique
   publique passe en lecture seule, le back-office reste accessible pour
   régulariser

⚠️ **À savoir avant de t'engager sur le mot « prélèvement automatique ».** La
documentation développeur de Djomy que j'ai lue expose des paiements ponctuels
et des liens de paiement. Je n'y ai vu **ni mandat, ni tokenisation de moyen de
paiement, ni abonnement récurrent**. En l'état, le renouvellement sera donc
*assisté* — un lien envoyé à échéance que le marchand valide sur son téléphone
— et non un vrai prélèvement sans action de sa part.

À vérifier auprès de leur support avant la phase 4 : existe-t-il un mécanisme
de paiement récurrent ou de mandat ? La réponse change le parcours de
renouvellement, pas l'architecture.

---

## 7. Console plateforme (`/superadmin`)

- liste des tenants : statut, plan, consommation des quotas, date d'échéance
- création manuelle d'un tenant, suspension, réactivation, résiliation
- **connexion en tant que** (impersonation) pour le support, systématiquement
  tracée dans un journal d'audit
- gestion des plans et des quotas
- suivi des abonnements et des impayés
- vérification des domaines personnalisés
- métriques : nombre de boutiques actives, volume de commandes, revenu récurrent

---

## 8. Inscription d'un marchand

Sur le domaine racine, `/inscription` :

1. saisie : nom de l'entreprise, slug souhaité (vérifié en direct), nom et
   email du gérant, mot de passe, téléphone
2. création en une transaction : `Tenant` + `Settings` + `User` rôle ADMIN +
   catégories par défaut + zones de livraison par défaut + `Subscription` en
   essai 14 jours
3. redirection vers `slug.tondomaine.com/admin` avec session ouverte
4. écran de démarrage : ajouter un produit, régler NIF/RCCM, ouvrir la boutique

Les slugs réservés (`app`, `www`, `api`, `admin`, `superadmin`, `mail`…) sont
refusés.

---

## 9. Migration de l'existant

Bilale & Danedjo devient le tenant n°1, sans perte de données.

```sql
-- 1. Créer le tenant
INSERT INTO "Tenant" (id, slug, name, status) VALUES (…, 'bilale', 'Bilale et Danedjo Corporation SARLU', 'ACTIF');

-- 2. Ajouter tenantId en NULLABLE sur chaque table
-- 3. Remplir : UPDATE "Product" SET "tenantId" = '<id>'; (× 14 tables)
-- 4. Passer les colonnes en NOT NULL
-- 5. Supprimer les anciennes contraintes uniques, créer les composites
-- 6. Reprendre la numérotation des tickets :
--    INSERT INTO "Counter" ("tenantId", key, value)
--    SELECT '<id>', 'SALE-2026', COALESCE(MAX(number), 0) FROM "Sale";
```

Cette migration s'écrit en SQL, pas en `db push` : `prisma db push` proposerait
de recréer les tables et détruirait les données. Passage obligatoire à
`prisma migrate` avec une migration écrite à la main.

**Sauvegarde de la base avant toute exécution** — Neon permet de créer une
branche, c'est le filet le plus simple.

---

## 10. Découpage en phases

| Phase | Contenu | Ampleur | Livrable vérifiable |
| ----- | ------- | ------- | ------------------- |
| **1. Fondations** | Modèle `Tenant`, `tenantId` sur les 14 modèles, contraintes composites, garde Prisma, migration SQL, reprise des 41 fichiers appelant Prisma | La plus lourde — c'est 70 % du travail | Le site actuel fonctionne à l'identique, mais tout est scopé à un tenant |
| **2. Adressage** | Résolution par host, sous-domaines, page « boutique introuvable », `tenantId` dans les sessions, panier préfixé, domaines personnalisés | Moyenne | Deux boutiques de test cohabitent sans se voir |
| **3. Inscription & console** | `/inscription`, `PlatformUser`, `/superadmin`, impersonation, journal d'audit | Moyenne | Créer une boutique de bout en bout sans toucher à la base |
| **4. Abonnements** | Plans, quotas, essai, facturation Djomy plateforme, suspension pour impayé | Moyenne | Un cycle complet essai → paiement → renouvellement |
| **5. Durcissement** | Tests d'isolation automatisés, chiffrement des clés Djomy marchand, RLS optionnelle, quotas appliqués | Petite mais indispensable | Une suite de tests qui échoue si une requête fuit entre tenants |

Je recommande de ne **rien livrer en production avant la fin de la phase 2** :
entre les deux, le système est dans un état intermédiaire où l'isolation n'est
pas complète.

---

## 11. Points de vigilance

**Le cache Next.js.** `revalidatePath("/produits")` est aujourd'hui global. En
multi-tenant, il invaliderait le cache de tous les marchands. Il faut passer
aux tags de cache préfixés par le tenant (`revalidateTag(\`tenant:\${id}:produits\`)`)
et rendre les pages publiques dynamiques par host.

**Les métadonnées et le SEO.** `metadataBase`, `sitemap.ts` et `robots.ts` sont
codés en dur sur `bilale-danedjo.com`. Ils doivent devenir dynamiques par host,
sinon toutes les boutiques déclareraient le même domaine canonique.

**Le logo et l'identité visuelle.** Les couleurs de marque sont dans
`globals.css` et le logo dans `/public/brand`. Chaque marchand voudra les
siennes : prévoir un stockage de fichiers (Vercel Blob ou S3) et des variables
CSS injectées par tenant. Ce n'est pas bloquant pour la phase 1, mais ça
arrivera vite dans les demandes.

**Le coût de la base.** Une seule base partagée, donc le plan Neon gratuit
tiendra un temps puis il faudra monter. À surveiller dès les premiers tenants
réels.

**Le risque principal reste la fuite entre tenants.** Un seul `findUnique`
oublié suffit. D'où la règle ESLint sur l'import du client brut, et la suite de
tests d'isolation de la phase 5 — qui devrait en réalité être écrite dès la
phase 1.

---

## 12. Ce que je te demande de valider

1. Le schéma d'adressage et le nom de domaine racine que tu comptes utiliser
2. Le passage de la numérotation des tickets de caisse sur compteur applicatif
3. Le principe d'une URL de webhook Djomy par tenant
4. Les plans envisagés : combien, à quel prix, avec quels quotas
5. Le fait de démarrer par la phase 1 seule, sans mise en production
