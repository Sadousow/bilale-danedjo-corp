# Bilale et Danedjo Corporation SARLU — Site vitrine

Site vitrine officiel de **Bilale et Danedjo Corporation SARLU**, entreprise guinéenne spécialisée dans la distribution et le commerce de détail (alimentation générale, produits d'entretien, électroménager).

> **Slogan :** *Votre partenaire du quotidien*

---

## Stack technique

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (avec `@theme inline` et variables CSS)
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

## Fonctionnalités principales

- Catalogue produits (alimentation, entretien, électroménager)
- Commande directe via **WhatsApp** (chaque produit a un message pré-rempli)
- Bouton flottant WhatsApp persistant
- Mobile-first, responsive, optimisé pour faible connexion
- SEO : metadata, sitemap, robots, Open Graph
- Polices auto-hostées via `next/font`

## Démarrage

```bash
npm install
npm run dev    # http://localhost:3000
```

## Build production

```bash
npm run build
npm run start
```

## Déploiement

Ce projet est prêt pour [Vercel](https://vercel.com) :

1. Importer ce dépôt
2. Aucune variable d'environnement requise (V1)
3. Déploiement automatique sur push vers `main`

## Structure

```
src/
├── app/                  # Pages App Router
│   ├── a-propos/
│   ├── produits/
│   ├── promotions/
│   ├── contact/
│   ├── faq/
│   ├── layout.tsx
│   ├── page.tsx          # Accueil
│   ├── sitemap.ts
│   └── robots.ts
├── components/           # Header, Footer, ProductCard, Hero, etc.
└── lib/
    ├── products.ts       # Catalogue + helpers
    └── site.ts           # Config marque + WhatsApp
```

## Configuration

Pour personnaliser le numéro WhatsApp, l'email ou les réseaux sociaux, éditer [`src/lib/site.ts`](src/lib/site.ts).

Pour ajouter / modifier des produits, éditer [`src/lib/products.ts`](src/lib/products.ts).

## Roadmap (Phase 2)

- Espace administration (dashboard)
- Panier d'achat + paiement Mobile Money
- Espace client
- Notifications promotions
- Application mobile

## Licence

© Bilale et Danedjo Corporation SARLU. Tous droits réservés.
