# Parcours d'inscription — audit et refonte

Audit du parcours d'ouverture d'une boutique, et ce qui a été corrigé.

---

## 1. Mise en route

```bash
npm run db:migrate:deploy
npx prisma generate
```

Une variable facultative, dans `.env` :

```
SIGNUP_ALERT_EMAIL="toi@guygou.com"
```

Tu es prévenu à chaque inscription. Laisser vide désactive l'alerte — mais un
appel dans les 24 heures double les chances qu'une inscription devienne un
client payant.

---

## 2. Ce qui n'allait pas

### La vitrine s'ouvrait au public à la seconde de l'inscription — grave

Un marchand s'inscrivait, et `sa-boutique.guygou.com` servait immédiatement
une vitrine **sans un seul produit, sans logo, avec les textes par défaut**.
L'adresse figure dans l'email de bienvenue et sur l'écran de confirmation :
elle circule tout de suite. Le premier lien qu'un commerçant partage avec sa
famille montrait une coquille vide.

*Une bonne chose existait déjà* : une boutique en essai n'est pas indexée par
les moteurs de recherche — `robots: index` ne passe à vrai qu'au statut ACTIF.
Le dégât était donc limité aux personnes à qui le marchand donnait l'adresse.
C'est-à-dire aux seules qui comptaient pour lui.

### Aucune notification — grave

Ni au marchand, ni à toi.

Le plus coûteux : **l'adresse de la boutique n'existait nulle part ailleurs
que dans l'onglet ouvert.** Un marchand qui le fermait perdait son
sous-domaine, sans page « retrouver ma boutique » pour le récupérer. Support
garanti, et abandon probable.

Et de ton côté, rien : aucun moyen de savoir qu'une boutique venait d'être
créée, donc aucun moyen d'appeler pendant que l'intérêt est encore chaud.

### Aucun numéro de téléphone collecté — sérieux

Le formulaire demandait un email. Pour un commerçant de Conakry, c'est le
canal le moins fiable — une adresse créée pour l'occasion et jamais relevée.
**Sans numéro, un marchand dont l'abonnement arrive à échéance est
injoignable**, et tu ne peux ni l'appeler, ni lui écrire sur WhatsApp, ni lui
envoyer un SMS le jour où ce canal sera branché.

### Pas de premiers pas — sérieux

Après l'inscription, le marchand atterrissait sur un tableau de bord vide,
avec des indicateurs à zéro et aucune indication sur quoi faire.

### L'adresse email de l'administrateur n'est jamais vérifiée — non corrigé

Une faute de frappe donne un compte irrécupérable et un marchand injoignable.
C'est plus grave que pour un client : toute la relation d'abonnement repose
sur cette adresse. La machinerie existe depuis le chantier des emails, il
reste à l'y brancher.

---

## 3. Ce qui a changé

### La boutique se publie

`Settings.shopPublished` vaut faux à la création. Tant qu'il l'est, la vitrine
sert une page sobre — « Cette boutique ouvre bientôt » — avec le nom du
commerce et son téléphone.

Le back-office, la caisse et la connexion ne sont **pas** concernés : ils ne
passent pas par cette mise en page. Le marchand travaille normalement et voit
sa boutique en aperçu avant de l'ouvrir.

Les boutiques déjà en ligne restent ouvertes : la migration les publie toutes.
Refermer la vitrine d'un marchand en production aurait été une régression pour
ses clients.

À ne pas confondre avec `shopEnabled`, qui ne ferme que le tunnel de commande
et laisse le catalogue consultable.

### Des premiers pas sur le tableau de bord

Tant que la vitrine n'est pas ouverte, un encart passe avant les chiffres —
qui sont de toute façon à zéro. Trois étapes, dans l'ordre où il faut s'y
prendre : les produits, le logo et les couleurs, les coordonnées. Chacune
indique où elle en est, et le bouton d'ouverture est au bout.

### Deux messages à l'inscription

**Au marchand** : son adresse en évidence, son lien de connexion, et le
rappel que sa boutique n'est pas encore publique. Ce message a une fonction
précise — être le seul endroit durable où figure son sous-domaine.

**À toi**, sur `SIGNUP_ALERT_EMAIL` : nom, adresse, responsable, email,
téléphone. Répondre à l'alerte écrit directement au marchand.

### Le téléphone est demandé, et réutilisé

Il alimente d'un coup les coordonnées de la boutique et son numéro WhatsApp —
que le marchand aurait saisi de toute façon. Une saisie en moins à la mise en
route.

### L'écran de confirmation ne ment plus

Il annonçait « Votre boutique est prête » alors qu'elle était vide et
publique. Il dit maintenant qu'elle est créée mais pas encore visible, et
invite à noter l'adresse.

---

## 4. Ce qui reste ouvert

- **Vérifier l'adresse email de l'administrateur** — le plus rentable des
  points restants.
- **Pas de politique de mot de passe** au-delà de 8 caractères.
- **`checkSlugAction` n'est pas limitée** — appelée à chaque frappe, elle
  permet d'énumérer les adresses prises. L'information est publique de toute
  façon, mais c'est une porte ouverte pour rien.
- **Rien ne relance un marchand qui s'inscrit et ne publie jamais.** C'est
  probablement le cas le plus fréquent, et le plus facile à récupérer : un
  message à trois jours suffirait.

---

## 5. Vérifications

Typecheck et ESLint au vert.

À contrôler à la main :

- [ ] créer une boutique d'essai avec ta vraie adresse email
- [ ] vérifier que la vitrine affiche « ouvre bientôt » et non un catalogue vide
- [ ] vérifier que `/admin` et `/login` fonctionnent normalement pendant ce temps
- [ ] vérifier que l'email de bienvenue arrive, avec la bonne adresse dedans
- [ ] publier depuis le tableau de bord, vérifier que la vitrine s'ouvre
- [ ] vérifier que la boutique de Bilale est restée ouverte après la migration
