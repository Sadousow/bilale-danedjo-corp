# S'abonner, payer, changer d'offre

Suite de [ABONNEMENTS.md](ABONNEMENTS.md) et de [CONSOLE.md](CONSOLE.md).

Le constat de départ : **un marchand ne pouvait ni changer d'offre, ni se
réabonner tout seul.** Trois défauts s'additionnaient, et le correctif de la
suspension livré la veille venait d'en rendre deux bloquants.

---

## 1. Le cercle fermé

Depuis que `Tenant.status` fermait réellement la boutique, le parcours d'un
marchand en retard de paiement ressemblait à ceci :

1. La passe de facturation le passe en `SUSPENDU`… **et écrit aussi
   `Tenant.status = SUSPENDU`.**
2. Cette valeur ferme tout, back-office compris. Il n'a plus l'écran où payer.
3. Même s'il payait, `settleInvoice()` ne remettait jamais `Tenant.status` à
   `ACTIF`. Sa boutique serait restée fermée pour toujours.

Le nœud est un champ qui voulait dire deux choses. `Tenant.status` servait à
la fois de décision administrative et de conséquence du non-paiement — donc
plus personne ne pouvait savoir laquelle des deux l'avait fermé, ni laquelle
devait le rouvrir.

**Corrigé par une règle simple : une signification par champ.**

| Champ | Ce qu'il dit | Qui l'écrit |
| --- | --- | --- |
| `Tenant.status` | La plateforme a fermé cette boutique à la main | La console, uniquement |
| `Subscription.status` | Où en est le paiement | Recalculé à chaque lecture |

La passe de facturation ne touche plus `Tenant.status`. Le non-paiement se lit
entièrement dans l'abonnement, et se répare en payant.

Une migration rouvre les boutiques fermées par l'ancienne passe — celles dont
l'abonnement est lui-même en impayé ou suspendu. Le cas ambigu est rouvert par
prudence : une boutique rouverte à tort se referme d'un clic depuis la console,
l'inverse coûte un appel du marchand.

---

## 2. Ce qui ferme, maintenant

| Situation | Vitrine | Caisse | Back-office |
| --- | --- | --- | --- |
| Essai, abonnement à jour | ouverte | ouverte | complet |
| Échéance dépassée (7 j de grâce) | ouverte | ouverte | complet + bandeau rouge |
| Grâce épuisée | **fermée** | ouverte | **Abonnement et Rapports** |
| Suspendue par la plateforme | fermée | fermée | fermé |

Deux décisions méritent d'être dites à voix haute.

**La caisse n'est jamais coupée pour un impayé.** C'est l'outil avec lequel le
marchand gagne de quoi payer. La lui retirer serait à la fois cruel et
contre-productif.

**Deux sections restent ouvertes, pas une de plus : payer, et récupérer ses
données.** Tout fermer priverait le marchand du seul écran où il peut
régulariser. Tout laisser ouvert reviendrait à offrir le service impayé.

La garde est posée dans `src/app/admin/layout.tsx`, pas dans les vingt pages :
une garde à recopier vingt fois est un oubli programmé. Le proxy transmet le
chemin demandé dans l'en-tête `x-chemin`, qu'une mise en page ne connaît pas
autrement.

Les sections fermées restent visibles dans le menu, barrées et non cliquables.
Un lien qui renvoie systématiquement ailleurs use la patience ; un menu amputé
donne l'impression que les données ont disparu. Elles sont *barrées*, et pas
seulement grisées : le cadenas seul se confondait avec celui des fonctions
absentes de l'offre, qui, elles, restent cliquables et mènent à l'écran qui les
explique.

---

## 3. Changer d'offre soi-même

La page disait « contactez-nous ». Elle a maintenant un bouton sur chaque
offre.

**Monter prend effet immédiatement.** Le marchand veut la fonction maintenant ;
le faire attendre trois semaines serait absurde. La différence part sur la
prochaine facture.

**Descendre prend effet à l'échéance.** Il a réglé la période en cours au tarif
supérieur, il la termine au tarif supérieur. Le choix est enregistré dans
`Subscription.pendingPlanId` et s'applique au moment où la facture suivante est
réglée — facture qui porte déjà, elle, le nouveau tarif.

Cette dernière phrase ne tenait que si la baisse précédait l'émission. Or la
facture part trois jours avant l'échéance : dans l'ordre courant, elle était
déjà émise à l'ancien tarif quand le marchand se décidait, et son règlement
appliquait quand même la baisse. Il payait le prix fort pour un mois au prix
faible. `repriceUpcomingInvoice()` réaligne désormais la facture en attente sur
l'offre qui sera servie — à la baisse comme à la montée, décidée par le
marchand ou depuis la console. Le lien Djomy, qui porte l'ancien montant, est
jeté avec : encaisser 350 000 sur une facture à 150 000 serait pire que le
défaut corrigé.

Quand l'échéance est déjà passée, aucune date n'est annoncée : le changement
prend effet « dès le règlement de votre facture ». Promettre un effet « le
15/07 » un 14 août ne veut rien dire.

**Une baisse est refusée si la boutique dépasse déjà les limites visées.** Le
message dit exactement ce qui dépasse :

> Impossible de passer à l'offre Démarrage : 120 produits actifs pour 50
> autorisés. Désactivez ce qui dépasse, puis réessayez — rien ne sera supprimé.

Ni supprimer son catalogue ni le laisser dans un état illégal n'étaient
acceptables.

Deux garde-fous secondaires : une montée d'offre est refusée tant qu'une
facture est impayée (offrir davantage à qui n'a pas payé le moins), et un
changement décidé depuis la console efface la baisse programmée par le marchand
— sans quoi son ancien choix s'appliquerait tout seul à l'échéance et
écraserait celui qu'on vient de prendre.

---

## 4. Deux bogues trouvés en chemin

### Le retour de paiement renvoyait le marchand chez nous

```ts
returnUrl: `${base}/superadmin/abonnements`,
```

`base` porte le domaine de la **plateforme**. Un marchand qui payait son
abonnement atterrissait donc sur la console, où il n'a aucun compte — un écran
de connexion qui ne le concerne pas, juste après avoir payé.

C'est la même erreur que celle corrigée sur le retour de paiement des commandes
clients : une adresse de plateforme employée là où il fallait celle du
marchand. Elle s'était glissée deux fois.

Corrigé : le retour pointe sur `<boutique>/admin/abonnement`, avec
`?paiement=recu` ou `?paiement=annule`. L'écran de retour ne prétend pas que le
paiement est confirmé — c'est le webhook qui fait foi, et Djomy renvoie le
payeur avant d'avoir toujours tranché.

### La facturation n'était jamais déclenchée

Aucun `vercel.json`, donc aucun cron. En production, `runBillingCycle()`
n'aurait tourné que si quelqu'un cliquait « Lancer le cycle » dans la console.
Aucune facture ne serait jamais partie toute seule.

Ajouté : un passage quotidien à 6 h. Vercel signe ses appels avec
`CRON_SECRET` ; la route refuse déjà tout appel non authentifié, et refuse
carrément de tourner en production si la variable est absente.

---

## 5. Ce que le premier essai grandeur nature a montré

Le parcours a été joué en entier sur une vraie boutique — échéance dépassée,
grâce épuisée, facture émise, changement d'offre, webhook signé, réouverture.
Quatre défauts sont sortis, tous invisibles en lecture de code.

### La facture sans bouton

Djomy exige le numéro du payeur. Il était pris dans `Settings.whatsappNumber`
ou `Settings.companyPhone` — deux champs qui s'affichent sur la vitrine. Une
boutique qui ne les avait pas renseignés recevait une facture avec, pour toute
issue, « Contactez-nous pour régler cette facture ». Et `Paramètres`, le seul
écran où saisir ces numéros, lui était fermé puisque sa boutique l'était.

Le cercle fermé du §1, réapparu par une autre porte.

Corrigé par un champ à part, `Subscription.billingPhone` : le numéro qui règle
l'abonnement ne regarde que la plateforme, et le marchand n'a pas à publier son
numéro personnel sur sa devanture pour pouvoir payer. Le champ se remplit
depuis la page Abonnement, celle qui reste ouverte exprès. Le lien manquant s'y
crée à la demande — `ensureInvoicePaymentLink()` — ce qui rattrape aussi le cas
où Djomy était indisponible au moment de l'émission.

### Payer un mois de retard n'achetait aucun jour

La période facturée part de l'ancienne échéance. Après trente jours de retard,
régler 350 000 GNF prolongeait du 15/07 au 14/08 — déjà passé. À la seconde où
il venait de payer, le marchand relisait « votre abonnement est échu, il vous
reste 7 jours ».

`renewedPeriodEnd()` : une facture dont la période est écoulée ouvre trente
jours à partir du règlement. Payée à temps, rien ne change — sinon payer trois
jours en avance en ferait perdre trois.

### Le rappel repartait tous les matins

`issueInvoiceFor()` est idempotent et renvoie la facture qu'il trouve. La passe
quotidienne, elle, ne regardait que `ok` : elle renvoyait donc le même rappel
chaque jour tant que la facture n'était pas payée. Le commentaire du code
affirmait le contraire.

`created` distingue maintenant les deux cas. Un marchand en difficulté n'a pas
besoin de relire la même relance chaque matin.

### Le webhook rejoué se félicitait à tort

Un règlement rejoué répondait `settled: true` alors que `settleInvoice()`
n'avait rien réglé. Sans conséquence en base — l'idempotence tenait — mais une
réponse qui ment sur ce qu'elle a fait finit toujours par égarer quelqu'un.

---

## 6. Vérification

```bash
npm run db:migrate:deploy      # Subscription.pendingPlanId, puis billingPhone
npx prisma generate            # arrêter le serveur de dev : il verrouille la DLL
npx eslint src
npx tsx scripts/test-abonnement.mjs
```

À contrôler dans le navigateur, sur une boutique dont l'échéance est passée de
plus de sept jours :

| Chemin | Attendu |
| --- | --- |
| `<boutique>/` | Vitrine fermée |
| `<boutique>/pos` | Caisse ouverte |
| `<boutique>/admin/produits` | Renvoi vers Abonnement, avec l'explication |
| `<boutique>/admin/abonnement` | Accessible, facture et bouton de paiement |
| `<boutique>/admin/rapports` | Accessible |
| Monter d'offre | Refusé tant que la facture est en attente |
| Descendre d'offre | Programmé à l'échéance, annulable |
| Facture sans lien | Champ « numéro Mobile Money » + bouton, pas de « contactez-nous » |
| Baisse après émission | La facture en attente passe au nouveau tarif |
| Après règlement d'un retard | Prochaine échéance à trente jours du paiement |
| Deux passages de facturation d'affilée | Une seule facture, un seul rappel |
