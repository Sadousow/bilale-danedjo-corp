# Personnalisation de la vitrine

Chaque marchand peut désormais habiller sa boutique : logo, couleurs, photo de
couverture, textes d'accueil, horaires et réseaux sociaux. Les photos de
produits s'envoient depuis un téléphone au lieu d'être collées sous forme
d'URL.

---

## 1. Mise en route

```bash
npm install                  # ajoute le client S3
npm run db:migrate:deploy
npx prisma generate
```

Puis le stockage d'images, dans `.env` :

```
S3_ENDPOINT="https://<compte>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="boutiques"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_PUBLIC_URL="https://images.tondomaine.com"
```

### Créer le bucket sur Cloudflare R2

1. Cloudflare → R2 → **Create bucket**, par exemple `boutiques`
2. Settings → **Public access** : activer un domaine public, idéalement un
   sous-domaine à toi (`images.tondomaine.com`) plutôt que l'URL R2 brute
3. R2 → **Manage API Tokens** → jeton *Object Read & Write* limité à ce bucket
4. Settings → **CORS Policy** — indispensable, le navigateur envoie
   directement au bucket :

```json
[
  {
    "AllowedOrigins": ["https://*.tondomaine.com", "https://tondomaine.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Sans cette règle CORS, les envois échouent avec une erreur réseau opaque —
c'est le piège classique de cette configuration.

**R2 plutôt que S3** parce qu'il n'y a pas de frais de sortie : des images
consultées depuis la Guinée sur un bucket S3 américain coûteraient à chaque
affichage.

Sans ces variables, l'application fonctionne : couleurs et textes restent
modifiables, un bandeau signale simplement que le téléversement est
indisponible.

---

## 2. Ce que le marchand peut changer

**Back-office → Apparence**, réservé aux administrateurs.

| | |
| --- | --- |
| **Logo** | Affiché dans l'en-tête, le pied de page et sur la page de connexion. Sans logo, le nom de la boutique s'affiche en toutes lettres — jamais d'image cassée. |
| **Couleurs** | Une couleur principale et une couleur d'accent. Les nuances claires et sombres en sont déduites : deux décisions, pas six. |
| **Photo de couverture** | Image large derrière le titre d'accueil, avec un voile sombre automatique pour que le texte blanc reste lisible quelle que soit la photo. |
| **Textes d'accueil** | Mention du haut, titre, phrase d'introduction. Le dernier mot du titre passe en couleur d'accent. |
| **Vos arguments** | Jusqu'à six encarts en bas de la page d'accueil. Les icônes restent fixes, les textes appartiennent au marchand. |
| **À propos** | Texte libre sur la page dédiée. |
| **Horaires et réseaux** | Un réseau laissé vide masque simplement son icône. |

Un aperçu en haut de page montre le rendu des couleurs et du bandeau sans
avoir à ouvrir la boutique.

---

## 3. Comment le thème s'applique

Les couleurs de marque sont des variables CSS déclarées dans `globals.css`.
La vitrine les redéclare avec les valeurs du marchand :

```
:root{--brand-blue:#0B2E63;--brand-gold:#D4A017;…}
```

Aucune classe Tailwind ne change — `bg-brand-blue` pointe déjà sur la
variable. Toute la boutique se repeint d'un coup, y compris les composants
écrits avant cette fonctionnalité.

Les couleurs saisies sont validées contre une expression régulière
hexadécimale stricte avant d'entrer dans le bloc `<style>`. Une valeur du type
`red;}body{display:none` retombe sur la couleur par défaut : on n'injecte
jamais dans une feuille de style ce qui vient d'un formulaire.

---

## 4. Le téléversement

Le fichier **ne transite pas par le serveur**. Le navigateur demande une URL
signée, valable 5 minutes, et envoie directement au stockage. C'est ce qui
permet d'accepter une photo de 5 Mo sans buter sur la limite de taille des
Server Actions.

Avant l'envoi, l'image est **redimensionnée dans le navigateur** — 1600 px de
côté maximum, JPEG qualité 82. Une photo de téléphone de 4 Mo tombe sous
300 Ko. Sur une connexion mobile guinéenne, c'est la différence entre un envoi
qui aboutit et un marchand qui abandonne.

Deux détails qui évitent des surprises : les petits PNG sont conservés tels
quels, pour ne pas détruire la transparence d'un logo ; et les PNG plus lourds
convertis en JPEG reçoivent un fond blanc, sans quoi la transparence vire au
noir.

**Le chemin de destination est décidé par le serveur seul**, préfixé par
l'identifiant de la boutique (`t/<tenantId>/…`). Un navigateur ne peut pas
écrire ailleurs, même en modifiant sa requête. La suppression vérifie le même
préfixe : une URL fournie par le client ne permet pas d'effacer chez un
voisin.

Formats acceptés : JPEG, PNG, WebP. Liste blanche, jamais liste noire.

---

## 5. Vérifications

Typecheck et ESLint au vert. Les fonctions de thème sont couvertes par
16 cas — dont les saisies hostiles : mots, couleurs sans dièse, tentative
d'injection CSS, `expression(...)`, fermeture de balise `</style>`. Toutes
retombent sur les valeurs par défaut.

À contrôler à la main :

- [ ] envoyer un logo depuis un téléphone, sur connexion mobile
- [ ] changer les deux couleurs et vérifier l'en-tête, les boutons et le
      bandeau promotions
- [ ] créer un produit avec photo, vérifier son affichage au catalogue et en
      caisse
- [ ] vérifier qu'un logo remplacé libère bien l'ancien fichier dans R2

---

## 6. Composer la page d'accueil

**Back-office → Page d'accueil.** Le marchand assemble sa page à partir de
sections que nous fournissons. Il ne fournit jamais de balisage.

### Les sections disponibles

| Section | Contenu |
| --- | --- |
| **Bandeau d'accueil** | Le grand visuel d'ouverture. Ses textes se règlent dans Apparence ; ici on choisit seulement sa position. |
| **Catégories** | Les familles du catalogue, avec leur description. |
| **Grille de produits** | Populaires, en promotion ou derniers ajoutés. Nombre réglable. Peut être répétée. |
| **Vos arguments** | Les encarts saisis dans Apparence. |
| **Texte libre** | Titre, paragraphes, bouton facultatif. Répétable. |
| **Image pleine largeur** | Une photo bord à bord, avec un texte par-dessus si besoin. Répétable. |
| **Appel à l'action** | Bandeau WhatsApp. Répétable. |

Chaque section se monte, se descend, se masque d'un œil barré ou se supprime.
Le fond — blanc, gris clair ou coloré — se choisit par section : alterner aide
le visiteur à distinguer les blocs.

Les sections uniques (bandeau, catégories, arguments) ne sont proposées à
l'ajout que si elles ne sont pas déjà présentes.

### Trois styles visuels

**Classique**, **Épuré**, **Chaleureux**. Ils n'agissent que sur les arrondis,
les ombres et l'espacement — les couleurs et les textes ne bougent pas. Trois
variables CSS suffisent :

```
--shop-radius   arrondi des cartes
--shop-spacing  hauteur des sections
--shop-shadow   ombre au repos (et --shop-shadow-hover au survol)
```

La classe `.shop-card` de `globals.css` les consomme. Les valeurs viennent
d'un tableau figé dans le code, jamais d'un formulaire : contrairement aux
couleurs, il n'y a rien à échapper ici.

### L'aperçu

Le panneau de droite affiche **la vraie vitrine dans un cadre**, pas une
maquette : même mise en page, mêmes produits, mêmes couleurs. Rien n'est
réimplémenté, donc rien ne peut diverger de la boutique réelle. Une bascule
permet de voir le rendu téléphone ou ordinateur — le cadre rend à sa taille
réelle puis est réduit, sinon les points de rupture basculeraient en version
mobile et l'aperçu mentirait.

Sur les écrans étroits, un bouton **Aperçu** l'ouvre en plein écran.

**Ce que vous voyez est un brouillon.** L'éditeur enregistre en continu, mais
uniquement dans des colonnes séparées : vos visiteurs continuent de voir la
page précédente jusqu'à ce que vous cliquiez sur **Publier**. Un bandeau
signale les modifications en attente, et *Abandonner* revient à la version
publiée.

C'est ce qui permet de tâtonner sans que la boutique change sous les yeux des
clients — et de retrouver son travail en revenant le lendemain, même sans
avoir publié.

Le brouillon n'est servi qu'à un administrateur connecté sur cette boutique,
sur l'adresse `?apercu=1`. Pour tout le monde d'autre, cette adresse affiche
simplement la page publiée : pas de refus visible, aucun indice qu'un
brouillon existe.

### Ce qui protège la page

La composition est enregistrée en JSON dans `Settings.homeBlocks`, et
**relue par `parseBlocks()` à chaque affichage**. C'est cette fonction, pas le
formulaire, qui est la frontière de confiance : un appel forgé à la Server
Action ne peut pas déposer autre chose que ce que le rendu sait déjà afficher.

- type de section inconnu → la section est ignorée
- lien de bouton en `javascript:`, `data:` ou `http:` → refusé, seuls les
  chemins internes et le `https://` passent
- URL contenant `"`, `'`, `<` ou `>` → refusée
- textes tronqués (120 caractères pour un titre, 2 000 pour un paragraphe)
- au plus 20 sections, au plus 24 produits par grille
- JSON absent, tronqué ou vide → composition d'origine, jamais une page blanche

Les images de blocs sont vérifiées une seconde fois au rendu : `next/image`
rejette à l'exécution tout domaine absent de `next.config.ts`, ce qui
casserait la page entière. Une URL d'un autre domaine est simplement ignorée.

Le bouton **Rétablir l'original** ramène la composition de départ sans toucher
aux couleurs ni aux textes.

Tests : `npm run test:blocks` — 55 vérifications, essentiellement des entrées
hostiles ou abîmées.

---

## 7. Ce qui reste commun

- **Le format des documents imprimés** — factures et reçus utilisent encore le
  logo `/public/brand/`. À basculer sur `settings.logoUrl`.
- **Les polices** — Poppins et Playfair pour toutes les boutiques.
- **Les autres pages** — seule la page d'accueil est composable. Catalogue,
  panier et contact gardent leur structure.
- **Les icônes** — celles des catégories et des arguments restent figées.
- **Pas de CSS ni de code fournis par le marchand.** C'est un choix, pas un
  oubli : un seul processus Node sert toutes les boutiques et détient les
  clés de paiement de chacune. Du code marchand exécuté là y aurait accès.
