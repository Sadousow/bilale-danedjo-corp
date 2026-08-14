# Bilale et Danedjo Corporation SARLU — Site, back-office & caisse

Plateforme de **Bilale et Danedjo Corporation SARLU**, entreprise guinéenne spécialisée dans la distribution et le commerce de détail (alimentation générale, produits d'entretien, électroménager).

Trois espaces dans une seule application :

- **Site vitrine et boutique** — catalogue, panier, commande en ligne, suivi
- **Commande par WhatsApp** conservée en parallèle
- **Back-office** (`/admin`) — commandes, produits, stock, ventes, facturation, clients & crédits, rapports, utilisateurs
- **Caisse / POS** (`/pos`) — encaissement, décrément de stock, reçu imprimable

👉 **Mise en route : voir [DEMARRAGE.md](DEMARRAGE.md)**

> **Slogan :** *Votre partenaire du quotidien*

---

## Stack technique

- **Next.js 16** (App Router, Turbopack, `proxy.ts`)
- **React 19** (Server Actions, `useActionState`)
- **TypeScript**
- **Tailwind CSS v4** (avec `@theme inline` et variables CSS)
- **Prisma 6 + PostgreSQL** — base de données
- **Djomy** — paiement en ligne (Orange Money, MTN MoMo, carte)
- **jose + bcryptjs** — sessions JWT httpOnly, mots de passe hachés
- **Polices Google :** Poppins (sans) + Playfair Display (display)

## Identité visuelle

| Couleur | Hex |
| ------- | --- |
| Bleu corporate | `#0B2E63` |
| Or premium | `#D4A017` |
| Blanc | `#FFFFFF` |

## Pages

| Route | Description |
| ----- | ----------- |
| `/` | Accueil — hero, catégories, produits populaires, promos, CTA WhatsApp |
| `/a-propos` | Présentation, mission, vision, valeurs |
| `/produits` | Catalogue avec filtre par catégorie + recherche |
| `/promotions` | Offres en cours et produits vedettes |
| `/contact` | Coordonnées, carte Google, formulaire WhatsApp |
| `/faq` | Questions fréquentes |
| `/panier` | Panier |
| `/commander` | Tunnel de commande |
| `/commande/[id]` | Confirmation et suivi de commande |
| `/compte` | Espace client — connexion, inscription, historique |
| `/login` | Connexion du personnel |
| `/pos` | Caisse — caissiers, gérants, admins |
| `/pos/ticket/[id]` | Reçu imprimable (rouleau 80 mm) |
| `/admin` | Tableau de bord — gérants et admins |
| `/admin/produits` | Catalogue : création, édition, activation |
| `/admin/stock` | Entrées, sorties, inventaire, alertes de rupture |
| `/admin/ventes` | Historique des ventes, détail, annulation |
| `/admin/clients` | Fiches clients, crédits, remboursements |
| `/admin/commandes` | Commandes en ligne, statuts, livraison |
| `/admin/factures` | Proformas, factures, bons de livraison |
| `/admin/factures/[id]/imprimer` | Document A4 imprimable |
| `/admin/rapports` | CA, marge, panier moyen, top ventes |
| `/admin/utilisateurs` | Comptes et rôles — admins uniquement |
| `/admin/parametres` | NIF, RCCM, banque, TVA, zones de livraison — admins uniquement |
| `/api/paiement/djomy` | Webhook de confirmation de paiement |

## Fonctionnalités principales

- Catalogue produits (alimentation, entretien, électroménager)
- Commande directe via **WhatsApp** (chaque produit a un message pré-rempli)
- Bouton flottant WhatsApp persistant
- Mobile-first, responsive, optimisé pour faible connexion
- SEO : metadata, sitemap, robots, Open Graph
- Polices auto-hostées via `next/font`

## Démarrage

```bash
copy .env.example .env   # puis renseigner DATABASE_URL et SESSION_SECRET
npm install
npm run db:push          # crée les tables
npm run db:seed          # produits + comptes de départ
npm run dev              # http://localhost:3000
```

Détail complet dans [DEMARRAGE.md](DEMARRAGE.md).

## Build production

```bash
npm run build
npm run start
```

## Déploiement

Ce projet est prêt pour [Vercel](https://vercel.com) :

1. Importer ce dépôt
2. Renseigner les variables `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`
3. Déploiement automatique sur push vers `main` (`prisma generate` inclus dans le build)

## Structure

```
prisma/
├── schema.prisma         # Modèles : User, Product, Sale, Customer, Stock…
└── seed.ts               # Données de départ

src/
├── proxy.ts              # Protection de /admin et /pos (ex-middleware)
├── app/
│   ├── (site)/           # Site vitrine public
│   │   ├── a-propos/  produits/  promotions/  contact/  faq/
│   │   ├── layout.tsx    # Header + Footer + WhatsApp
│   │   └── page.tsx      # Accueil
│   │   ├── panier/  commander/  commande/  compte/
│   ├── api/              # Webhook de paiement
│   ├── login/            # Connexion du personnel
│   ├── pos/              # Caisse + reçu imprimable
│   ├── admin/            # Back-office
│   ├── layout.tsx        # Layout racine (polices, metadata)
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── admin/            # Navigation et UI du back-office
│   ├── shop/             # Panier, bouton d'ajout, compteur d'en-tête
│   └── …                 # Header, Footer, ProductCard, Hero, etc.
└── lib/
    ├── db.ts             # Client Prisma (singleton)
    ├── documents.ts      # Facturation : totaux HT/TVA/TTC, statuts, montant en lettres
    ├── orders.ts         # Commandes : statuts, frais de livraison, téléphones
    ├── shop-auth.ts      # Comptes clients de la boutique
    ├── payment/djomy.ts  # Intégration du prestataire de paiement
    ├── settings.ts       # Paramètres société (NIF, RCCM, banque, TVA)
    ├── auth.ts           # Sessions, rôles, hachage
    ├── session.ts        # JWT (compatible edge, utilisé par proxy.ts)
    ├── catalog.ts        # Lecture du catalogue (DB + repli statique)
    ├── format.ts         # Formatage GNF, dates, libellés
    ├── products.ts       # Catalogue statique de secours
    └── site.ts           # Config marque + WhatsApp
```

## Configuration

Pour personnaliser le numéro WhatsApp, l'email ou les réseaux sociaux, éditer [`src/lib/site.ts`](src/lib/site.ts).

Pour ajouter / modifier des produits, éditer [`src/lib/products.ts`](src/lib/products.ts).

## Roadmap

- [x] Espace administration (dashboard)
- [x] Point de vente (caisse) avec gestion de stock
- [x] Clients et gestion des crédits
- [x] Facturation : proforma, facture définitive, bon de livraison
- [x] Boutique en ligne : panier, commande, paiement Mobile Money
- [x] Espace client et suivi de commande
- [ ] Mode hors-ligne du POS (PWA + synchronisation)
- [ ] Notifications SMS de suivi de commande
- [ ] Application mobile

## Licence

© Bilale et Danedjo Corporation SARLU. Tous droits réservés.
