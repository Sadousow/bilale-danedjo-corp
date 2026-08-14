# La personnalisation marche-t-elle partout ?

Audit de tout ce qu'un visiteur voit, à la recherche de ce qui ne suit pas les
réglages du marchand. Neuf problèmes trouvés, tous corrigés — puis la
personnalisation étendue à tout ce qui restait, sauf les polices.

---

## 1. Le pire : les clients d'une boutique écrivaient à une autre

`buildWhatsAppLink` retombait sur le numéro du commerce d'origine quand le
marchand n'en avait pas renseigné :

```ts
const digits = (number || siteConfig.whatsapp).replace(/[^\d]/g, "");
```

Conséquence : sur une boutique sans numéro WhatsApp, **tous les boutons
« Commander sur WhatsApp » ouvraient une conversation avec Bilale & Danedjo**.
Un commerçant concurrent recevait les demandes de commande, et le marchand ne
voyait jamais passer ses propres clients.

C'était présent sur la page d'accueil, la FAQ, les promotions, la page
Contact et le suivi de commande.

**Corrigé.** La fonction rend une chaîne vide sans numéro, et chaque bouton
disparaît quand elle ne rend rien. Un bouton absent vaut mieux qu'un bouton
qui envoie chez le voisin.

---

## 2. Les données du commerce d'origine servies aux autres

`siteConfig` contenait le nom, le slogan, la description, les horaires, le
téléphone et l'adresse de Bilale & Danedjo. Trois d'entre eux étaient servis
aux autres boutiques :

| Où | Ce qui s'affichait |
| --- | --- |
| Titre du bandeau d'accueil | « Votre partenaire du quotidien » |
| Pied de page | « alimentation générale, produits d'entretien et électroménager » |
| Page Contact — horaires | « Lun – Sam : 08h00 – 20h00 » |

Le premier est le plus visible : c'est le **titre H1** de la page d'accueil de
toute boutique sans slogan.

Le troisième n'était même pas un repli : la page Contact lisait `siteConfig`
**directement**, en ignorant purement les horaires saisis par le marchand.

**Corrigé.** `siteConfig` ne contient plus que des replis génériques, et la
page Contact lit les réglages.

---

## 3. Les documents imprimés portaient les couleurs de la plateforme

Factures, proformas et bons de livraison sont rendus sous `/admin`, qui
n'injecte pas le thème de la boutique. `text-brand-blue` y valait donc le vert
de Guÿgou.

**Une facture engage juridiquement le marchand.** La voir sortir aux couleurs
de son fournisseur de logiciel est un défaut sérieux — et il s'est aggravé
avec le changement de marque : avant, c'était le bleu de Bilale, tout aussi
faux mais moins voyant.

**Corrigé.** La page d'impression injecte désormais le thème du marchand.

Le ticket de caisse n'était pas concerné : il s'imprime en noir sur papier
thermique, sans aucune couleur.

---

## 4. La carte de la page Contact était figée sur Conakry

Une boutique à Kankan, Labé ou N'Zérékoré affichait une carte de Conakry.

**Corrigé.** La carte suit l'adresse du marchand, et disparaît s'il n'en a pas
renseigné.

---

## 5. Les cases à cocher ignoraient les couleurs

Huit fichiers portaient `accent-[#0b2e63]` en dur — l'ancien bleu. Sur le
tunnel de commande d'un marchand, les cases restaient bleues quelle que soit
sa palette ; dans le back-office, elles restaient bleues alors que l'outil est
vert.

**Corrigé**, elles suivent la variable de couleur.

---

## 6. Un bug trouvé en chemin

Dans le back-office, sur une commande, le bouton « Écrire sur WhatsApp »
utilisait `settings.whatsappNumber` — **le numéro de la boutique
elle-même**. Le marchand ouvrait donc une conversation avec lui-même au lieu
d'écrire à son client.

**Corrigé** : le message part vers le numéro du client.

---

## 7. La caisse

Deux fuites de plus, trouvées en reprenant l'audit sur `/pos` :

**« Bilale & Danedjo » était écrit en dur dans l'en-tête de la caisse.** Chaque
caissier, chez chaque marchand, le voyait à côté du mot « Caisse ». **Corrigé**
— c'est le nom de la boutique qui s'affiche.

**Le placeholder de la page de connexion** proposait `vous@bdcorporation.com`
à tout le monde. **Corrigé.**

### Et un défaut latent, plus sérieux

Le retour de paiement d'une commande faisait passer `NEXT_PUBLIC_SITE_URL`
**avant** l'hôte réel de la requête. Cette variable est unique pour toute la
plateforme, et le fichier d'exemple invite à la renseigner.

Le jour où tu la remplis en production, un client de `bilale.guygou.com` qui
règle par Djomy est renvoyé sur `guygou.com/commande/<id>` — une adresse qui
n'existe pas dans la zone plateforme. **Il perd la confirmation de la commande
qu'il vient de payer.**

Le défaut est aujourd'hui dormant, parce que la variable n'est pas définie
dans ton `.env`. Il se serait réveillé au déploiement. **Corrigé** : le retour
suit l'hôte de la requête, donc la bonne boutique, y compris sur un domaine
personnalisé.

### La ligne de partage, revue

Le terminal de caisse portait les couleurs de Guÿgou, comme le back-office.
Il porte désormais celles du marchand, et la distinction mérite d'être
explicite pour qui reprendra le code :

| | À qui |
| --- | --- |
| Vitrine, caisse, documents imprimés, emails | **Au marchand** |
| Back-office, zone plateforme, avis d'abonnement | **À Guÿgou** |

La caisse bascule du côté du marchand parce que **son écran fait face au
comptoir** : le client le regarde pendant qu'il paie. Le back-office, lui,
reste l'outil qu'on loue.

---

## 8. Tout est personnalisé, sauf les polices

**L'image de partage.** Route `/vignette`, composée à la volée au nom et aux
couleurs de la boutique. C'est ce qui apparaît quand un lien est collé dans
WhatsApp — le canal par lequel passe l'essentiel du commerce en Guinée.

Le logo n'y figure pas volontairement : il faudrait le télécharger depuis le
stockage à chaque génération, et un échec ferait tomber toute la vignette.

*Piège rencontré en route :* la convention de fichier `opengraph-image` de
Next construit l'adresse de l'image à partir de `metadataBase`, qui retombait
sur le domaine racine. La vignette d'une boutique était annoncée sur
`guygou.com` au lieu de son sous-domaine, et WhatsApp n'aurait rien affiché.
C'est pour cette raison que l'image passe par une route explicite, dont
l'adresse absolue est déclarée par la page à partir de l'hôte réel.

**Le favicon.** Route `(site)/icon.tsx` : l'initiale du commerce sur sa
couleur principale. Pas son logo, et c'est délibéré — à 16 pixels, un
logotype détaillé devient une tache illisible là où une lettre reste nette.

**Les emails** portent les couleurs de la boutique. Les avis d'abonnement,
eux, restent à Guÿgou : c'est la plateforme qui réclame son dû. Les couleurs
entrent dans un attribut `style` et sont donc filtrées contre une expression
hexadécimale stricte, avec des tests sur les tentatives d'injection.

**La caisse** passe aux couleurs du marchand, contrairement au back-office.
La différence n'est pas cosmétique : l'écran de caisse fait face au comptoir,
et le client le regarde pendant qu'il paie.

**Le ticket** affiche le logo du marchand quand il en a un. À contrôler sur
une vraie imprimante thermique : une image s'y dégrade vite.

**La palette de départ** d'une boutique neuve est désormais neutre — un
ardoise sombre et un ambre chaud, qui s'accordent avec n'importe quel logo.
Les boutiques existantes gardent leurs couleurs.

---

## 9. Ce qui reste commun à toutes les boutiques

**Les polices.** Poppins pour tout le monde, et c'est un choix assumé.

Laisser choisir une police obligerait soit à en précharger plusieurs pour
tous — coûteux sur une connexion mobile guinéenne, où chaque requête se paie
en secondes d'attente — soit à les charger par boutique, ce qui ralentit le
premier affichage. Le gain esthétique ne vaut pas ce prix.

**Les icônes des catégories et des arguments** restent figées : seules les
icônes changent, pas les textes, qui appartiennent déjà au marchand.

**La structure des pages autres que l'accueil.** Catalogue, panier et contact
gardent leur agencement. Seule la page d'accueil se compose.

**Le logo dans l'image de partage et le favicon** — les deux se contentent du
nom et des couleurs. Volontaire dans les deux cas : téléchargement fragile
pour la vignette, illisibilité à 16 pixels pour le favicon.

---

## 10. Vérifications

Typecheck et ESLint au vert.

À contrôler à la main, sur une boutique dont les réglages sont **vides** —
c'est le cas qui révélait tous ces défauts :

- [ ] page d'accueil : le titre du bandeau ne parle pas d'un autre commerce
- [ ] pied de page : la description n'évoque pas l'alimentation générale
- [ ] page Contact : horaires vides masqués, pas de carte sans adresse
- [ ] aucun bouton WhatsApp visible tant qu'aucun numéro n'est renseigné
- [ ] imprimer une facture après avoir changé la couleur principale
- [ ] cocher une case dans le tunnel de commande et vérifier sa couleur
