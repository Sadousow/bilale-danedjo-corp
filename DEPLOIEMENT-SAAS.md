# Phase 2 — adressage et mise en production

Ce qui a changé, et comment brancher le DNS et Vercel.
Voir aussi [ARCHITECTURE-SAAS.md](ARCHITECTURE-SAAS.md) et
[MIGRATION-MULTITENANT.md](MIGRATION-MULTITENANT.md).

---

## 1. Migration à appliquer

Le schéma a bougé (deux champs sur `Settings`) :

```bash
npm run db:migrate            # en développement
npm run db:migrate:deploy     # en production
```

Puis, dans **Paramètres**, renseignez le **numéro WhatsApp** et le **slogan**
de la boutique. Sans cela, les boutons « Commander sur WhatsApp » retombent sur
le numéro historique inscrit dans `src/lib/site.ts` — ce qui serait faux dès la
deuxième boutique.

---

## 2. Comment les adresses sont réparties

| Adresse | Ce qui s'affiche |
| ------- | ---------------- |
| `tondomaine.com` | Vitrine de la plateforme |
| `www.tondomaine.com` | Idem |
| `bilale.tondomaine.com` | Boutique, back-office et caisse du marchand |
| `maboutique.com` | Même boutique, via son domaine personnalisé |
| n'importe quoi d'autre | Page « cette boutique n'existe pas » |

Le domaine racine est réécrit en interne vers `/plateforme` : l'adresse
affichée reste propre. Les sous-domaines réservés (`www`, `app`, `api`,
`admin`, `mail`…) ne peuvent pas être attribués à un marchand.

`/admin`, `/pos` et `/login` n'existent que sur une boutique : sur le domaine
racine, ils redirigent vers l'accueil.

---

## 3. Variables d'environnement

### Sans elles, rien ne démarre

| Variable | Pourquoi |
| --- | --- |
| `DATABASE_URL` | La base. Sur Neon, l'URL *poolée* |
| `DIRECT_URL` | La même sans `-pooler` — c'est elle qui joue les migrations |
| `SESSION_SECRET` | Signe les sessions. 32 caractères minimum, sinon l'application refuse de servir la moindre page |
| `TENANT_SECRET_KEY` | Chiffre les clés de paiement des marchands. 32 caractères minimum. **La perdre rend illisibles toutes les clés déjà enregistrées** |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `guygou.com` en production. Laisser `localhost:3000` ferait pointer chaque marchand vers la machine du visiteur |

### Sans elles, une fonction manque en silence

| Variable | Ce qui tombe |
| --- | --- |
| `CRON_SECRET` | **La facturation ne tourne pas du tout.** En production, la route refuse de s'exécuter sans ce secret plutôt que de s'ouvrir à n'importe qui. Aucune facture ne part, aucune boutique n'est suspendue |
| `DJOMY_CLIENT_ID` / `DJOMY_CLIENT_SECRET` | Aucun lien de paiement d'abonnement. Les marchands voient « le paiement en ligne est momentanément indisponible » |
| `RESEND_API_KEY` / `MAIL_FROM` | Ni mot de passe oublié, ni vérification d'adresse, ni rappel d'échéance |
| `S3_*` | Le téléversement d'images est désactivé — couleurs et textes restent modifiables |
| `SIGNUP_ALERT_EMAIL` | Aucune alerte à l'inscription d'une boutique |

### Facultatif

```
VERCEL_TOKEN="..."               # rattache les domaines des marchands tout seul
VERCEL_PROJECT_ID="prj_..."
VERCEL_TEAM_ID="team_..."        # uniquement si le projet est dans une équipe
CSP_REPORT_ONLY="1"              # première mise en ligne : observer sans bloquer
```

Sans les variables Vercel, tout fonctionne : la vérification DNS a lieu, et
l'application affiche simplement la marche à suivre pour ajouter le domaine à
la main dans le tableau de bord.

### Une dette laissée en évidence

`next.config.ts` porte `typescript: { ignoreBuildErrors: true }`. Le garde
d'isolation injecte `tenantId` à l'exécution, mais les types générés par Prisma
continuent de l'exiger des appelants : 45 erreurs sur une couture qui
fonctionne, et un build qui refusait de livrer du code qui tourne. Tant que
cette ligne est là, **aucune** erreur de type n'arrête un déploiement, y
compris les vraies.

---

## 4. DNS de la plateforme

Chez votre registrar, sur `tondomaine.com` :

| Type | Nom | Valeur |
| ---- | --- | ------ |
| A | `@` | `76.76.21.21` |
| CNAME | `*` | `cname.vercel-dns.com` |
| CNAME | `cname` | `cname.vercel-dns.com` |

Le **wildcard** `*` est ce qui fait vivre les sous-domaines : sans lui, aucune
boutique n'est joignable.

L'enregistrement `cname` sert de cible aux domaines personnalisés des
marchands, pour ne pas leur exposer l'infrastructure directement.

### Côté Vercel

Dans Settings → Domains, ajouter :

- `tondomaine.com`
- `*.tondomaine.com`

Le certificat wildcard exige une validation DNS : Vercel demande un
enregistrement `TXT` sur `_acme-challenge`. À ajouter chez le registrar, une
seule fois.

---

## 5. Domaines personnalisés des marchands

Le marchand se rend dans **Paramètres → Adresse de la boutique**, saisit son
domaine, et l'application lui affiche deux enregistrements à publier :

| Type | Nom | Rôle |
| ---- | --- | ---- |
| `TXT` | `_bdc-verification` | prouve qu'il possède bien le domaine |
| `A` ou `CNAME` | `@` ou le sous-domaine | achemine le trafic |

Puis il clique sur « Vérifier ». L'application interroge le DNS public : si le
TXT correspond, le domaine passe en vérifié et — quand `VERCEL_TOKEN` est
configuré — est déclaré automatiquement sur le projet.

Tant qu'un domaine n'est pas vérifié, **il ne résout aucune boutique**. C'est
volontaire : sans cette étape, n'importe qui pourrait détourner le trafic d'un
domaine qu'il ne possède pas.

---

## 6. En développement

Les sous-domaines de `localhost` fonctionnent dans Chrome et Firefox :

```
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
```

- `localhost:3000` → vitrine de la plateforme
- `bilale.localhost:3000` → la boutique

Si votre navigateur ne les résout pas, utilisez `lvh.me`, qui pointe vers
127.0.0.1 : `bilale.lvh.me:3000`.

Pour créer une deuxième boutique de test :

```bash
TENANT_SLUG=demo TENANT_NAME="Boutique de démonstration" npm run db:seed
```

---

## 7. Ce qui est maintenant propre à chaque boutique

- **Métadonnées** — titre, description, URL canonique, Open Graph
- **`sitemap.xml` et `robots.txt`** — calculés depuis le host. Une boutique en
  essai ou suspendue n'est pas indexée
- **Numéro WhatsApp, téléphone, email, adresse, slogan** — issus des réglages
- **Panier** — la clé de stockage local est préfixée par l'hôte : deux
  boutiques ouvertes dans le même navigateur ne partagent plus leur panier
- **Clés Djomy** — chaque marchand encaisse avec les siennes, chiffrées en base
- **Webhook de paiement** — une URL par boutique, affichée dans les paramètres

---

## 8. Ce qui reste commun — et le deviendra moins

**Le logo et les couleurs.** `public/brand/` et les variables CSS de
`globals.css` sont partagés par toutes les boutiques. C'est le prochain sujet
visible : dès la deuxième boutique réelle, le marchand voudra son logo. Il
faudra un stockage de fichiers (Vercel Blob ou S3) et des variables CSS
injectées par tenant.

**Le cache.** Les pages publiques lisent les en-têtes pour résoudre la
boutique, ce qui force Next.js à les rendre dynamiquement : il n'y a donc pas
de fuite de cache entre marchands. En contrepartie, aucune page publique n'est
mise en cache statiquement. Quand le trafic le justifiera, il faudra passer à
`revalidateTag` avec des étiquettes préfixées par le tenant.

**Les horaires d'ouverture** sont encore dans `src/lib/site.ts`.

**Les textes du bandeau d'accueil** — la mention « Distribution & commerce —
Conakry » et le paragraphe d'introduction de `Hero.tsx` — sont écrits en dur.
Le slogan, lui, vient bien des réglages.

---

## 10. Vérification avant de pousser

```bash
npm run lint                     # vert
npx tsx scripts/test-abonnement.mjs
npm run build                    # arrêter le serveur de dev d'abord :
                                 # il verrouille la DLL du moteur Prisma
```

`npx tsc --noEmit` **ne passe pas** : 45 erreurs, toutes sur la couture du
garde multi-tenant décrite au §3. Le build les ignore volontairement. Ne pas
lire ce rouge comme une régression, ni s'y habituer.

---

## 9. Avant d'ouvrir à un vrai deuxième client

- [ ] `npm run db:test-isolation` passe sur la base de production
- [ ] Numéro WhatsApp et slogan renseignés pour chaque boutique
- [ ] Wildcard DNS et certificat vérifiés
- [ ] `TENANT_SECRET_KEY` sauvegardée ailleurs que sur le serveur — la perdre
      rend illisibles toutes les clés de paiement des marchands
- [ ] Console super-admin (phase 3) : sans elle, créer ou suspendre une
      boutique passe par un accès direct à la base
