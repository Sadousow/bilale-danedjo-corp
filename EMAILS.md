# Messages sortants

Réinitialisation de mot de passe, accusés de réception de commande et rappels
d'abonnement. Le canal branché est l'email ; la couche est écrite pour que le
SMS s'ajoute sans réécrire les appelants.

---

## 1. Mise en route

```bash
npm run db:migrate:deploy
npx prisma generate
```

Puis, chez [Resend](https://resend.com) :

1. Créer un compte, **ajouter le domaine** `guygou.com`
2. Poser les enregistrements DNS proposés — DKIM et SPF — dans Cloudflare
3. Ajouter un **DMARC** : `_dmarc.guygou.com` en TXT, valeur
   `v=DMARC1; p=none; rua=mailto:dmarc@guygou.com`
4. Attendre la vérification, puis créer une clé d'API

```
RESEND_API_KEY="re_..."
MAIL_FROM="notifications@guygou.com"
MAIL_REPLY_TO=""
```

Sans ces variables l'application fonctionne : les écrans existent, les envois
sont simplement inertes et signalés dans les journaux.

**Ne saute pas le DMARC.** Sans lui, Gmail et Outlook classent volontiers en
indésirable les messages d'un domaine jeune — et un lien de réinitialisation
qui arrive en spam ne vaut pas mieux qu'un lien qui n'arrive pas.

---

## 2. Ce qui part, et de la part de qui

| Message | Destinataire | Nom affiché |
| --- | --- | --- |
| Mot de passe oublié — personnel | L'employé | La boutique |
| Mot de passe oublié — client | Le client | La boutique |
| Mot de passe oublié — plateforme | L'agent | Guÿgou |
| Commande reçue | Le client | La boutique |
| Nouvelle commande | Le marchand | La boutique |
| Échéance, impayé, suspension | L'administrateur de la boutique | Guÿgou |

**Le nom affiché est celui de la boutique, pas le nôtre.** Un client qui
commande chez Bilale doit voir « Bilale et Danedjo » dans sa boîte : il n'a
jamais entendu parler de Guÿgou, et un expéditeur inconnu finit en
indésirable. L'adresse technique reste la nôtre, sur le seul domaine vérifié.

**Un seul domaine d'expédition, et c'est un choix.** Faire vérifier son propre
domaine à chaque marchand serait meilleur pour la délivrabilité, mais aucun
commerçant de Conakry ne posera un enregistrement DKIM dans une zone DNS —
l'inscription en libre-service s'arrêterait là.

**La réponse va au marchand.** Le `Reply-To` porte l'adresse de la boutique.
Une réponse à un accusé de réception doit arriver chez le commerçant, pas chez
nous, qui ne saurions pas quoi en faire. Sur l'alerte envoyée au marchand,
c'est l'inverse : répondre écrit au client.

**Les rappels d'abonnement visent l'administrateur**, pas l'adresse publique
de la vitrine. Un impayé n'a rien à faire dans la boîte que lisent les
clients.

---

## 3. Mot de passe oublié

Trois familles de comptes, un seul mécanisme. Les écrans :

- `/mot-de-passe` — personnel de la boutique
- `/compte/mot-de-passe` — clients de la boutique
- `/superadmin/mot-de-passe` — agents de la plateforme

### Ce qui protège ce parcours

**Le jeton est haché en base.** Il n'existe en clair que dans le lien envoyé.
Une copie de la base ne donne pas la main sur les demandes en cours.

**Usage unique, une heure de validité.** Une réinitialisation réussie annule
tous les autres liens du même compte, et deux clics simultanés sur le même
lien ne produisent qu'un seul changement — la consommation du jeton et la mise
à jour du mot de passe sont dans la même transaction.

**La réponse est toujours identique**, que le compte existe ou non. Sans cela,
le formulaire deviendrait un outil pour savoir qui est client de quelle
boutique, ou quel employé travaille où.

**Le lien est rattaché à une boutique.** Un jeton émis sur une boutique ne
vaut rien sur une autre : le scope et le tenant sont relus en base, jamais
depuis l'URL.

**Le formulaire est limité** — cinq demandes par heure et par adresse, via le
compteur déjà en place. Sans cela, n'importe qui pourrait s'en servir pour
inonder la boîte d'un tiers.

### Ce que ça ne fait pas

**Changer son mot de passe ne déconnecte pas les sessions ouvertes.** Les
sessions sont des jetons signés, vérifiés sans lecture en base — c'est ce qui
les rend rapides. Les révoquer demanderait un appel à la base à chaque
requête. Conséquence : quelqu'un qui aurait déjà une session active la garde
jusqu'à son expiration, douze heures pour le personnel. À corriger le jour où
ce risque pèsera plus que le coût.

---

## 4. Commandes

L'accusé de réception part au client s'il a laissé une adresse, l'alerte au
marchand s'il en a renseigné une dans ses réglages.

**Aucun de ces envois ne peut faire échouer une commande.** Ils partent en
arrière-plan, toutes les erreurs sont avalées et journalisées. Une commande
enregistrée dont l'accusé n'est pas parti reste une commande enregistrée ;
l'inverse serait un désastre pour le marchand.

---

## 5. Le canal SMS, prévu mais non branché

`src/lib/messaging/channel.ts` définit un canal ; `email.ts` en est la seule
implémentation. Le jour où le SMS s'ajoute, il suffira de l'insérer dans le
tableau de `send.ts` — un destinataire sans email mais avec un numéro sera
alors joint automatiquement, sans qu'aucun appelant ne change.

C'est pour cette raison que **le texte brut est écrit en premier dans chaque
gabarit et se suffit à lui-même.** Le HTML est l'habillage ; le texte est le
message, et c'est lui qui partira par SMS.

Ce choix mérite d'être rappelé : **beaucoup de tes marchands ne liront jamais
leurs emails.** Un commerçant de Madina a WhatsApp et un numéro. Tant que le
SMS n'est pas branché, la récupération de mot de passe reste théorique pour
une partie d'entre eux — et tu recevras encore des appels.

Pistes vérifiées : Orange propose une API SMS pour la Guinée à partir
d'environ 150 GNF par message, payable en crédit de communication, mais ne
touche que ses propres abonnés. Des agrégateurs couvrent Orange, MTN, Intercel
et Sotelgui, plus cher et complet.

---

## 6. Vérifications

`npm run test:messages` — 48 contrôles sur les gabarits : échappement des noms
de boutique et de client hostiles, montants absents ou textuels, présence du
lien et de l'essentiel dans le texte brut, et **injection d'en-tête** par un
nom d'expéditeur contenant un retour à la ligne.

Typecheck et ESLint au vert.

À contrôler à la main, une fois Resend configuré :

- [ ] demander un lien depuis `/mot-de-passe`, le suivre, changer le mot de
      passe, se connecter
- [ ] redemander un lien et vérifier que le premier ne fonctionne plus
- [ ] passer une commande avec une adresse email et vérifier les deux messages
- [ ] vérifier que le nom affiché est celui de la boutique
- [ ] répondre à un accusé de réception et vérifier où arrive la réponse
- [ ] regarder dans quel dossier arrivent les messages chez Gmail

---

## 7. Confirmation d'adresse et reprise de compte

Cette partie ferme une faille réelle. Jusqu'ici, à l'inscription d'un client :

```
compte existant trouvé par email OU par téléphone
  → on lui attache le mot de passe fourni
  → session ouverte
```

Autrement dit, **connaître l'adresse email d'un client — ou simplement son
numéro — suffisait à prendre son compte**, avec son historique de commandes et
son solde de crédit. Ces comptes sans mot de passe sont créés à chaque vente
en caisse : il y en a beaucoup.

### Ce qui se passe maintenant

**Adresse inconnue.** Rien à voler : le compte est créé, la session ouverte, et
un message de confirmation part pour marquer l'adresse comme prouvée. L'usage
n'est pas bloqué en attendant — le faire coûterait des clients sans rien
protéger.

**Un compte existe déjà à cette adresse, sans mot de passe.** Il n'est **pas**
rattaché. Un lien de récupération part vers cette adresse, et c'est en
l'ouvrant que la personne prouve qu'elle relève cette boîte. Elle choisit
alors son mot de passe — le parcours de réinitialisation, réutilisé tel quel.

**Le rapprochement par téléphone a été supprimé**, et c'était le plus grave
des deux : un numéro se connaît ou se devine bien plus facilement qu'une boîte
email, et rien ne permet d'en prouver la possession par email.

### Deux détails qui comptent

**Le message de récupération ne dit rien du compte visé** — ni solde, ni
commandes. Tant que le lien n'est pas ouvert, on ignore qui a demandé ; si
c'est un intrus, il ne doit rien apprendre de ce qu'il vient de déclencher.
Un test le vérifie.

**Le lien est rattaché à une boutique.** Un jeton émis ailleurs ne vaut rien
ici.

### Ce que ça ne fait pas

L'inscription révèle toujours qu'une adresse est **déjà pourvue d'un mot de
passe** — « un compte existe déjà avec cette adresse ». C'est une fuite
d'information difficile à éviter sur un formulaire d'inscription, et le
compromis habituel.

---

## 8. Ce qui reste ouvert

Email de bienvenue à l'inscription d'une boutique, reçu de paiement après
règlement Djomy, et **notification de changement de mot de passe au
titulaire** — ce dernier étant la façon la plus simple de repérer une prise de
contrôle, et le plus rentable des trois à écrire.
