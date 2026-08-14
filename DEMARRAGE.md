# Démarrage — boutique, back-office, caisse & facturation

Guide de mise en route de la boutique en ligne, du back-office, du point de
vente (POS) et de la facturation. À faire une seule fois, dans l'ordre.

---

## 1. Créer une base PostgreSQL

Deux options simples :

**Neon** (gratuit, recommandé — compatible Vercel)

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un projet, région Europe (Frankfurt) — la plus proche de la Guinée
3. Copier les deux chaînes de connexion :
   - la **pooled** (avec `-pooler` dans le nom d'hôte) → `DATABASE_URL`
   - la **direct** (sans `-pooler`) → `DIRECT_URL`

**PostgreSQL local** (développement)

```bash
# les deux variables reçoivent la même valeur
postgresql://postgres:postgres@localhost:5432/bdcorp
```

---

## 2. Créer le fichier `.env`

Copier `.env.example` en `.env`, puis remplir :

```bash
copy .env.example .env      # Windows
```

Générer une clé de session :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Coller le résultat dans `SESSION_SECRET`.

> `.env` ne doit **jamais** être commité — il est déjà dans `.gitignore`.

---

## 3. Installer et initialiser

```bash
npm install          # installe Prisma, jose, bcryptjs… + génère le client Prisma
npm run db:push      # crée les tables dans la base
npm run db:seed      # catégories, produits du catalogue, 3 comptes de départ
npm run dev
```

Le seed affiche les identifiants créés :

| Compte                      | Rôle           | Mot de passe par défaut |
| --------------------------- | -------------- | ----------------------- |
| admin@bdcorporation.com     | Administrateur | `Admin@2026`            |
| gerant@bdcorporation.com    | Gérant         | `Gerant@2026`           |
| caissier@bdcorporation.com  | Caissier       | `Caisse@2026`           |

> ⚠️ **Changez ces mots de passe immédiatement** depuis
> Back-office → Utilisateurs → Réinitialiser un mot de passe.

---

Le seed crée aussi trois zones de livraison par défaut — pensez à ajuster
leurs tarifs dans Paramètres avant d'ouvrir la boutique.

---

## 4. Les espaces

| URL         | Accès                   | Contenu                                        |
| ----------- | ----------------------- | ---------------------------------------------- |
| `/`         | Public                  | Site vitrine + boutique (catalogue en base)    |
| `/panier`   | Public                  | Panier                                         |
| `/commander`| Public                  | Tunnel de commande                             |
| `/compte`   | Public                  | Espace client (facultatif)                     |
| `/pos`      | Caissier, Gérant, Admin | Écran de caisse                                |
| `/admin`    | Gérant, Admin           | Back-office complet                            |

`/admin/utilisateurs` et `/admin/parametres` sont réservés au rôle
**Administrateur**.

---

## 5. Rôles

| Rôle               | Caisse | Produits, stock, ventes, clients, factures, rapports | Utilisateurs & paramètres |
| ------------------ | :----: | :--------------------------------------------------: | :-----------------------: |
| **Caissier**       |   ✅   |                          ❌                          |            ❌             |
| **Gérant**         |   ✅   |                          ✅                          |            ❌             |
| **Administrateur** |   ✅   |                          ✅                          |            ✅             |

---

## 6. Utilisation quotidienne

### Caisse (`/pos`)

1. Rechercher ou toucher un produit → il s'ajoute au panier
2. Ajuster les quantités (+ / − ou saisie directe)
3. Remise éventuelle en GNF
4. Choisir le mode de paiement (espèces, Orange Money, MTN MoMo, virement, crédit)
5. Saisir le montant reçu — le bouton « Appoint » remplit le total exact
6. **Encaisser** → la monnaie à rendre s'affiche, le stock est décrémenté
7. « Imprimer le reçu » ouvre un ticket au format rouleau 80 mm

Une vente **à crédit** exige un client. Le reste dû est ajouté automatiquement
à son solde, et le plafond de crédit (s'il est défini) est vérifié.

### Back-office (`/admin`)

- **Produits** — catalogue commun au site vitrine et à la caisse. Un produit
  désactivé disparaît des deux.
- **Stock** — entrées (livraisons), sorties (casse, perte), ajustements
  d'inventaire. Chaque mouvement est historisé avec son auteur.
- **Ventes** — historique, détail par ticket, annulation (remet le stock et
  solde le crédit correspondant).
- **Clients & crédits** — fiches, historique d'achats, encaissement des
  remboursements.
- **Commandes** — commandes passées sur le site (voir §7).
- **Facturation** — proformas, factures et bons de livraison (voir §8).
- **Rapports** — CA, marge brute, panier moyen, ventes par jour, par mode de
  paiement, par caissier, meilleures ventes.
- **Paramètres** — NIF, RCCM, coordonnées bancaires, taux de TVA, conditions
  de paiement, zones de livraison. À renseigner **avant d'émettre la première
  facture** et **avant d'ouvrir la boutique**.

---

## 7. Boutique en ligne

### Parcours client

```
Catalogue ──▶ Panier ──▶ Commander ──▶ Confirmation & suivi
                          (coordonnées, zone, paiement)
```

Le compte client est **facultatif** : on peut commander en invité. Créer un
compte permet de retrouver ses informations et de suivre ses commandes depuis
`/compte`. Un client qui achète déjà en boutique est automatiquement rapproché
par son numéro de téléphone — une seule fiche pour la caisse, les factures et
le site.

Le bouton WhatsApp reste présent sur chaque produit : les deux canaux
coexistent.

### Zones de livraison

Paramètres → **Zones de livraison**. Chaque zone porte un tarif, un délai
indicatif et, si vous le souhaitez, un seuil de gratuité (« offerte à partir
de X GNF »). Le client choisit sa zone au moment de la commande et les frais
s'ajoutent au total.

Le seed crée trois zones de départ : Conakry centre, Conakry banlieue,
intérieur du pays. Ajustez les tarifs avant l'ouverture.

### Traitement d'une commande

Reçue → Confirmée → Préparée → En livraison → Livrée

**C'est la confirmation de livraison qui décrémente le stock**, et qui marque
la commande payée si le client règle à la livraison. Annuler une commande déjà
livrée remet les quantités en stock. Le bouton **Établir la facture** génère la
facture définitive, frais de livraison inclus en ligne séparée.

### Paiement en ligne (Djomy)

Le paiement à la livraison fonctionne sans configuration. Pour activer le
paiement en ligne (Orange Money, MTN MoMo, carte) :

1. Créer un compte sur [djomy.africa](https://djomy.africa) et récupérer
   `clientId` et `clientSecret` dans l'espace marchand → Développeurs
2. Les renseigner dans `.env` :

   ```
   DJOMY_CLIENT_ID="..."
   DJOMY_CLIENT_SECRET="..."
   DJOMY_API_BASE_URL="https://api.djomy.africa"
   NEXT_PUBLIC_SITE_URL="https://votre-domaine.com"
   ```

   ⚠️ **Vérifiez l'URL de base de l'API dans votre espace marchand** — la
   documentation publique ne la précise pas. Pour tester, utilisez d'abord le
   sandbox ([sandbox.djomy.africa](https://sandbox.djomy.africa)).

3. Déclarer le webhook dans l'espace marchand :
   `https://votre-domaine.com/api/paiement/djomy`
4. Cocher **Proposer le paiement en ligne** dans Paramètres → Boutique

Sans les clés, l'option reste masquée pour les clients — il n'y a rien à
désactiver manuellement.

Le webhook fait foi pour le statut de paiement ; la page de retour revérifie
malgré tout la transaction auprès de Djomy plutôt que de croire le paramètre
d'URL. Si l'initialisation du paiement échoue, la commande est conservée et
basculée en paiement à la livraison.

---

## 8. Facturation

### Avant la première facture

Aller dans **Paramètres** et renseigner au minimum : raison sociale, adresse,
NIF, RCCM. Ces mentions apparaissent en en-tête de tous les documents. Les
coordonnées bancaires et les conditions de paiement s'affichent en pied de
facture.

### Enchaînement des documents

```
Proforma  ──convertir──▶  Facture  ──générer──▶  Bon de livraison
   (devis)                (créance)              (stock décrémenté)
```

Chaque document porte son propre numéro et reste consultable. La chaîne est
visible depuis la fiche de n'importe lequel d'entre eux.

1. **Proforma** — `PRO-2026-0001`. Créée en brouillon, modifiable. Émise, elle
   peut être marquée acceptée ou refusée. « Convertir en facture » la fige au
   statut *Convertie* et crée la facture correspondante.
2. **Facture** — `FAC-2026-0001`. Une fois émise, elle n'est plus modifiable.
   Les règlements s'enregistrent depuis sa fiche ; le statut passe
   automatiquement de *Émise* à *Partiellement réglée* puis *Réglée*.
3. **Bon de livraison** — `BL-2026-0001`. Se génère depuis une proforma ou une
   facture. **C'est la confirmation de livraison qui décrémente le stock**, pas
   la facture. Annuler un BL déjà livré remet les quantités en stock.

Un document en **brouillon** est modifiable et supprimable. Dès qu'il est
**émis**, il est figé : seule l'annulation reste possible.

### TVA

Le taux par défaut (18 %) se règle dans Paramètres. Sur chaque document, une
case permet d'émettre en exonération — la ligne « Exonéré de TVA » remplace
alors le détail HT/TVA/TTC.

Attention : **les prix du catalogue sont TTC** (ce sont ceux de la caisse et du
site). Quand vous sélectionnez un produit dans une ligne de facture, le prix
est automatiquement converti en HT selon le taux actif. Vous pouvez le
corriger manuellement.

### Facturer une vente encaissée

Depuis le détail d'une vente (Ventes → un ticket), le bouton **Établir la
facture** crée la facture correspondante, déjà marquée réglée. Le stock ayant
déjà été décrémenté par la caisse, aucun bon de livraison n'est nécessaire.

### Impression

Chaque document dispose d'un aperçu A4 imprimable, avec en-tête de
l'entreprise, mentions légales, montant en toutes lettres, coordonnées
bancaires, zone de cachet et signature — et, sur le bon de livraison, une case
de signature client « reçu conforme ».

---

## 9. Déploiement sur Vercel

1. Pousser le dépôt sur GitHub
2. Importer le projet dans Vercel
3. Ajouter les variables d'environnement : `DATABASE_URL`, `DIRECT_URL`,
   `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, et les clés Djomy si le paiement
   en ligne est activé
4. Déployer — `npm run build` lance `prisma generate` automatiquement

Pour appliquer le schéma en production, la première fois :

```bash
npx prisma db push
```

---

## 10. Commandes utiles

| Commande             | Effet                                              |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Serveur de développement                           |
| `npm run db:push`    | Synchronise le schéma avec la base (sans migration) |
| `npm run db:migrate` | Crée une migration versionnée                      |
| `npm run db:seed`    | Réinjecte catégories, produits et comptes          |
| `npm run db:studio`  | Interface visuelle de la base (Prisma Studio)      |

---

## 11. Points d'attention

- **Les prix sont des entiers en GNF** (pas de centimes). Un prix de
  285 000 GNF est stocké comme `285000`.
- **Les images produits** viennent d'URL externes. Tout nouveau domaine doit
  être ajouté à `images.remotePatterns` dans `next.config.ts`.
- **Suppression d'un produit** : s'il a déjà été vendu, il est désactivé au
  lieu d'être supprimé, pour préserver l'historique des ventes.
- **Sans `DATABASE_URL`**, le site vitrine continue de fonctionner sur le
  catalogue statique de `src/lib/products.ts` ; le back-office et la caisse,
  eux, ne fonctionnent pas.
- **Numérotation des documents** : séquentielle par type et par année
  (`FAC-2026-0001`, puis `FAC-2027-0001`). Les compteurs vivent dans la table
  `Counter` — ne les modifiez pas à la main.
- **Un document émis ne se modifie plus.** C'est volontaire : une facture
  émise est une pièce comptable. Pour corriger, annulez-la et réémettez.
- **Les prix du panier ne sont jamais utilisés pour facturer.** Le serveur
  relit systématiquement les prix et le stock en base au moment de valider la
  commande ; le panier du navigateur ne sert qu'à l'affichage.
- **Le stock n'est pas réservé au moment de la commande**, seulement contrôlé.
  Deux clients peuvent commander le dernier article ; la disponibilité est
  revérifiée à la confirmation.
- **Les pages `/panier`, `/commander`, `/commande/...` et `/compte` sont en
  `noindex`** : elles n'ont pas vocation à être référencées.
