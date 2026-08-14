# Limites par offre — audit et correctifs

Vérification de ce qui est réellement appliqué quand un marchand dépasse son
offre, ou tente une fonction qu'il n'a pas payée.

---

## 1. Ce qui fonctionnait déjà

Contrairement à ce qu'il paraissait, l'essentiel était en place :

| Limite | Où elle s'applique |
| --- | --- |
| Nombre de produits | Blocage à la création |
| Nombre d'utilisateurs | Blocage à la création |
| Boutique en ligne | Tunnel de commande refusé, écran Commandes fermé |
| Facturation | Écran Facturation fermé |

Le cycle de vie de l'abonnement était lui aussi correct : à l'échéance la
boutique passe en impayé, après le délai de grâce elle est suspendue et la
vitrine ferme — **mais la caisse reste ouverte**. Couper l'outil de travail
d'un commerçant pour un retard de paiement l'empêcherait de gagner de quoi
payer.

---

## 2. Cinq brèches trouvées

### Le domaine personnalisé n'était pas verrouillé — manque à gagner

`addDomainAction` vérifiait le rôle, jamais l'offre. **Un marchand sur
l'offre à 150 000 GNF pouvait brancher son propre nom de domaine**, une
fonction vendue avec l'offre à 750 000. C'était la seule fonction du
catalogue qui n'était pas contrôlée, et la plus chère.

**Corrigé.** L'action refuse et renvoie vers la page Abonnement.

### Les quotas se contournaient par réactivation

Le quota d'utilisateurs comptait les comptes **actifs**. Il suffisait donc de
désactiver un compte, d'en créer un nouveau, puis de réactiver l'ancien pour
dépasser la limite — autant de fois que voulu.

**Corrigé.** Réactiver repasse par le contrôle, pour les utilisateurs comme
pour les produits.

### Produits et utilisateurs ne se comptaient pas pareil

Les produits étaient comptés **tous**, actifs ou non ; les utilisateurs
seulement actifs. Un marchand qui rangeait son ancien catalogue restait donc
bloqué par des produits qu'il ne vendait plus.

**Corrigé** : on compte les actifs des deux côtés, ce qui est cohérent avec
le contrôle à la réactivation.

### Le panier restait visible sans l'option boutique

Sur une offre sans vente en ligne, le client pouvait ajouter des articles,
ouvrir son panier, remplir le formulaire de commande — et n'être refusé qu'à
la toute dernière étape, par le contrôle côté serveur. Mauvais pour le
marchand, qui perd le client sans le savoir.

**Corrigé.** Les boutons d'ajout et l'icône du panier disparaissent, et les
pages `/panier` et `/commander` sont fermées — l'adresse restait devinable.
La vitrine devient un catalogue, et les appels à commander sur WhatsApp
prennent le relais.

### La baisse d'offre passait sans trace

La console changeait le plan sans regarder si la boutique rentrait dans les
nouvelles limites.

**Choix retenu : on ne supprime rien.** Effacer les produits d'un marchand
parce qu'il descend d'offre serait inacceptable. Il garde son catalogue, les
quotas l'empêchent simplement d'en ajouter tant qu'il n'est pas repassé sous
la limite. Le dépassement est **journalisé** — sans cette trace, un marchand
descendu d'offre pourrait conserver indéfiniment un catalogue qu'il ne paie
plus, sans que personne s'en aperçoive.

---

## 3. Une section fermée explique, au lieu de disparaître

Auparavant, un marchand qui cliquait sur Facturation sans y avoir droit
recevait une **page introuvable**. Ça ressemblait à une panne, ça ne disait
rien de la marche à suivre, et ça gaspillait l'instant précis où il était le
plus disposé à payer.

### Ce qui s'affiche maintenant

Un écran qui donne les trois choses nécessaires pour décider :

- **ce que la fonction apporte**, décrit en bénéfices et non en
  fonctionnalités ;
- **combien elle coûte** — l'offre la moins chère qui l'ouvre, et son prix ;
- **où cliquer**.

L'offre proposée est toujours la **moins chère** qui débloque la fonction.
Pousser l'offre la plus chère quand une intermédiaire suffit se retournerait
contre nous le jour où le marchand s'en apercevrait.

### Les sections restent dans le menu, avec un cadenas

Les masquer aurait été plus propre, mais un marchand qui ignore ce qu'il rate
ne monte jamais d'offre. Le lien fonctionne et mène à l'écran d'explication.

### Les sous-pages aussi

Cinq pages — détail d'une commande, détail, création, modification et
impression d'un document — étaient **atteignables par adresse directe sans
aucun contrôle d'offre**. Un signet suffisait à contourner le verrou. Elles
sont désormais fermées.

J'avais d'abord employé la page introuvable sur ces sous-pages. **C'était une
erreur, repérée en vérifiant dans le navigateur** : le 404 de l'application
annonce « Cette boutique n'existe pas », un message destiné aux sous-domaines
inconnus. Un marchand connecté à sa propre boutique lisait donc qu'elle
n'existait pas. Elles affichent maintenant le même écran d'explication que la
section.

Seule exception : la page d'impression d'un document garde le 404. Elle n'a
pas de mise en page — c'est une feuille A4 — et un écran commercial y serait
déplacé.

Même traitement pour la section Domaine des paramètres, en version resserrée.

Les pages **publiques** — panier, tunnel de commande — gardent le 404 : un
visiteur n'a rien à faire d'un argumentaire destiné au marchand.

---

## 4. Chaque section, et l'offre qui l'ouvre

Vérifié écran par écran sur une boutique en offre Démarrage.

| Section du back-office | Offre requise | Ce qui limite |
| --- | --- | --- |
| Tableau de bord | Démarrage | — |
| **Commandes** | **Boutique** | Boutique en ligne |
| Produits | Démarrage | Quota : 100 / 500 / illimité |
| Stock | Démarrage | Suit le quota produits |
| Ventes en caisse | Démarrage | — |
| **Facturation** | **Boutique** | Proformas, factures, bons de livraison |
| Clients & crédits | Démarrage | — |
| Rapports | Démarrage | — |
| Utilisateurs | Démarrage | Quota : 2 / 5 / illimité |
| Abonnement | Démarrage | — |
| Apparence | Démarrage | — |
| **Page d'accueil** | **Boutique** | Compose la vitrine |
| Paramètres | Démarrage | — |
| ↳ *section Adresse de la boutique* | **Pro** | Nom de domaine personnalisé |
| Caisse tactile | Démarrage | — |

**Cette répartition correspond exactement à ce que la page des tarifs
annonce** : « Caisse, stock, clients et rapports » sur toutes les offres, la
boutique en ligne et la facturation à partir de Boutique, le domaine
personnalisé sur Pro. Aucune section ne promet plus qu'elle ne tient, aucune
ne verrouille ce qui est vendu.

Deux points valent d'être notés :

**Rapports et Clients & crédits sont ouverts dès l'offre la moins chère.**
Beaucoup de logiciels réservent les statistiques aux offres supérieures. Ce
n'est pas ce que ta page de tarifs promet, donc le code est cohérent — mais
c'est un levier commercial que tu n'utilises pas.

**Le Stock n'a pas de limite propre.** Il suit celle des produits, ce qui est
juste : on ne stocke que ce qu'on a au catalogue.

### La vitrine entière suit l'offre, pas seulement le panier

Premier réflexe : masquer le panier et laisser le catalogue. C'était une
demi-mesure — les fiches produit et les prix restaient publics, c'est-à-dire
l'essentiel de ce que la boutique en ligne est censée apporter.

Sur une offre sans vente en ligne, **aucune page de vitrine n'est servie**.
Le sous-domaine affiche le nom du commerce, son téléphone et son adresse. Ni
catalogue, ni navigation, ni fiches produit — vérifié sur `/` comme sur
`/produits`.

Ce n'est pas une page d'erreur : le marchand a partagé cette adresse, et son
client doit pouvoir le joindre.

**L'éditeur de page d'accueil suit**, puisqu'il ne compose que cette vitrine.

**L'écran Apparence reste ouvert à toutes les offres**, et c'est délibéré : le
logo et les couleurs qu'on y règle habillent aussi la caisse, les tickets et
les factures. Un marchand sans boutique en ligne en a besoin.

---

## 5. Vérifications

`npm run test:quotas` — 29 contrôles, dont les deux qui décident vraiment :

- **à la limite exacte, la création est refusée.** Une comparaison `>` au
  lieu de `>=` laisserait passer un produit de trop sur chaque offre ;
- **le domaine personnalisé reste fermé sur l'offre intermédiaire.**

Typecheck et ESLint au vert.

À contrôler à la main :

- [ ] sur une offre Démarrage, tenter d'ajouter un domaine personnalisé
- [ ] atteindre la limite de produits, en désactiver un, en créer un autre,
      puis tenter de réactiver le premier
- [ ] vérifier qu'aucun bouton « Ajouter au panier » n'apparaît sur une offre
      sans vente en ligne, et que `/panier` renvoie une page introuvable
- [ ] descendre une boutique d'offre depuis la console et vérifier la ligne
      dans le journal

---

## 6. Ce qui reste ouvert

**Le marchand ne peut pas changer d'offre lui-même.** Seule la console le
permet, ce qui veut dire qu'une montée en gamme — donc une recette — dépend
d'un échange manuel. C'est le point le plus rentable à traiter ensuite.

**Rien n'invite à monter d'offre au moment où la limite est atteinte.** Le
message dit « changez d'offre » sans lien ni prix : c'est exactement l'instant
où le marchand est le plus disposé à payer.

**Aucune alerte à l'approche de la limite.** Un marchand découvre le plafond
en le heurtant, jamais avant.
