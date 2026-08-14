# Phase 1 terminée — isolation multi-tenant

Ce document décrit ce qui a changé et comment appliquer la migration.
Le plan d'ensemble reste dans [ARCHITECTURE-SAAS.md](ARCHITECTURE-SAAS.md).

> ⚠️ **Rien n'est prêt pour la production.** La phase 2 (adressage par
> sous-domaine côté DNS et Vercel) n'est pas faite. En local, tout fonctionne.

---

## 1. Appliquer la migration

**Sauvegarder d'abord.** Sur Neon : créer une branche depuis la console. C'est
le seul filet en cas de problème.

Ajouter dans `.env` :

```
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
TENANT_SECRET_KEY="<32 caractères aléatoires>"
```

Puis :

```bash
npm install
npm run db:baseline    # la base existe déjà : on la met sous contrôle de migrations
npm run db:migrate:deploy
npx prisma generate
npm run dev
```

### Pourquoi `db:baseline` ?

La base contient déjà des tables, mais Prisma ne les a jamais suivies : il
refuse d'appliquer quoi que ce soit et renvoie **P3005 — The database schema
is not empty**.

Le script `scripts/baseline.mjs` lit la structure *actuelle* de la base, en
fait une migration `0_init` et la marque comme déjà appliquée. Elle ne sera
jamais rejouée sur cette base ; elle sert à reconstruire l'historique pour une
base neuve.

Il passe par l'API Node plutôt que par une redirection shell : sous
PowerShell, `>` écrit en UTF-16 et Prisma ne sait pas relire le fichier
obtenu. C'est le piège classique de cette manipulation sous Windows.

À ne lancer qu'une fois. Si `prisma/migrations/0_init/` existe déjà, le script
saute l'étape de génération.

La boutique est désormais sur **http://bilale.localhost:3000** — plus sur
`localhost:3000`, qui devient la zone plateforme.

> `npm run db:push` est à proscrire désormais : il recréerait les tables et
> détruirait les données. Utiliser `db:migrate` en développement,
> `db:migrate:deploy` en production.

---

## 2. Ce qui a changé

### Base de données

- deux nouvelles tables : `Tenant`, `TenantDomain`
- une colonne `tenantId` sur les 16 modèles métier, indexée, en cascade
- toutes les contraintes uniques sont devenues composites : deux marchands
  peuvent avoir le même SKU, le même client, la même adresse email
- `Settings` a le `tenantId` pour clé primaire — une ligne par boutique
- `Counter` a une clé primaire composite `(tenantId, key)`
- **le numéro de ticket ne vient plus d'une séquence PostgreSQL** mais du
  compteur applicatif ; la migration reprend la numérotation là où elle en
  était, aucun ticket ne change de numéro

Les données existantes sont rattachées au tenant `bilale`.

### Code

| Avant | Après |
| ----- | ----- |
| `import { prisma } from "@/lib/db"` | `import { db } from "@/lib/tenant-db"` puis `const prisma = await db();` |
| requête non filtrée | `tenantId` injecté automatiquement par la garde |
| `prisma` exporté du module `db` | `platformDb`, interdit d'import hors plateforme |

38 fichiers ont été repris. Les 4 requêtes SQL brutes portent maintenant un
`WHERE "tenantId" = ...` explicite : la garde ne les voit pas.

### Sessions

Les jetons portent le `tenantId`. Une session émise sur une boutique est
**rejetée** sur une autre, et le cookie correspondant est effacé. Cela vaut
pour le personnel comme pour les clients finaux.

Conséquence : toutes les sessions en cours sont invalidées par la migration.
Il faudra se reconnecter.

### Paiement

Chaque marchand a ses propres clés Djomy, chiffrées en AES-256-GCM avec
`TENANT_SECRET_KEY`. Les variables d'environnement `DJOMY_*` ne servent plus
qu'à la plateforme.

L'URL du webhook devient propre à chaque boutique :

```
https://<boutique>/api/paiement/djomy/<tenantId>
```

C'est nécessaire : la signature se vérifie avec la clé secrète du marchand,
donc il faut savoir de qui vient l'appel avant de pouvoir l'authentifier.

---

## 3. Vérifier l'isolation

```bash
node scripts/test-isolation.mjs
```

Le script crée deux boutiques factices, y écrit des données, et vérifie
qu'aucune ne peut lire, modifier ou supprimer celles de l'autre — y compris
par identifiant direct. Les boutiques de test sont supprimées à la fin, même
en cas d'échec.

Une règle ESLint refuse par ailleurs tout import de `platformDb` hors des
modules autorisés :

```
error  'platformDb' import from '@/lib/db' is restricted.
       platformDb ne filtre pas par tenant. Utilisez db() ou tenantDb().
```

---

## 4. Créer une deuxième boutique en local

```bash
TENANT_SLUG=demo TENANT_NAME="Boutique de démonstration" npm run db:seed
```

Elle sera accessible sur `http://demo.localhost:3000`, avec son propre
catalogue, ses propres utilisateurs et ses propres numéros de facture.

---

## 5. Ce qui reste à faire

**Phase 2 — adressage.** DNS wildcard, configuration Vercel, page « boutique
introuvable », domaines personnalisés et leur vérification. C'est ce qui
manque pour une mise en production.

**Points connus, non traités en phase 1 :**

- `sitemap.ts`, `robots.ts` et `metadataBase` sont encore codés en dur sur
  `bilale-danedjo.com` — toutes les boutiques déclareraient le même domaine
  canonique
- `revalidatePath` est global : invalider le cache d'une boutique invalide
  celui des autres. À passer en `revalidateTag` préfixé par le tenant
- le logo et les couleurs de marque sont communs à toutes les boutiques
- pas encore de console super-admin ni d'inscription en libre-service
  (phase 3), ni d'abonnements (phase 4)
