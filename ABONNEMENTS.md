# Phase 4 — abonnements et facturation

Dernier volet de la série : [ARCHITECTURE-SAAS.md](ARCHITECTURE-SAAS.md),
[MIGRATION-MULTITENANT.md](MIGRATION-MULTITENANT.md),
[DEPLOIEMENT-SAAS.md](DEPLOIEMENT-SAAS.md),
[CONSOLE-PLATEFORME.md](CONSOLE-PLATEFORME.md).

---

## 1. Mise en route

```bash
npm run db:migrate:deploy
npx prisma generate
```

La migration crée les trois offres et **rattache les boutiques existantes au
plan Pro, actif un an**. Personne ne se retrouve bloqué du jour au lendemain
par une facturation qui n'existait pas hier.

Deux variables à ajouter :

```
CRON_SECRET="<chaîne aléatoire>"      # protège le passage de facturation
DJOMY_CLIENT_ID / DJOMY_CLIENT_SECRET # encaissement de la plateforme
```

Et le webhook à déclarer dans **ton** espace Djomy — celui de la plateforme,
pas celui d'un marchand :

```
https://tondomaine.com/api/abonnement/djomy
```

Enfin, `vercel.json` à la racine :

```json
{
  "crons": [{ "path": "/api/abonnement/cycle", "schedule": "0 6 * * *" }]
}
```

---

## 2. Les offres

| | Démarrage | Boutique | Pro |
| --- | --- | --- | --- |
| **Prix / mois** | 150 000 GNF | 350 000 GNF | 750 000 GNF |
| Produits | 100 | 500 | illimité |
| Utilisateurs | 2 | 5 | illimité |
| Caisse, stock, clients | ✅ | ✅ | ✅ |
| Boutique en ligne | — | ✅ | ✅ |
| Facturation | — | ✅ | ✅ |
| Domaine personnalisé | — | — | ✅ |

Modifiables depuis la base ou la console : prix, quotas et fonctions sont des
colonnes, pas du code.

**L'essai de 14 jours donne l'offre Boutique**, pas la plus chère : le
marchand découvre ce qu'il achètera, sans tomber de haut à la conversion.

---

## 3. Ce qui se passe quand on ne paie pas

```
Échéance ──▶ IMPAYÉ (7 jours) ──▶ SUSPENDU
             bandeau rouge         vitrine fermée
             tout fonctionne       back-office ouvert
```

Pendant la période de grâce, **rien n'est bloqué** : le marchand voit un
bandeau rouge avec le nombre de jours restants, et continue de travailler.

Une fois suspendu, la vitrine publique affiche « Cette boutique est
momentanément fermée » — pas une erreur technique, le visiteur n'y est pour
rien. Le back-office reste accessible pour régulariser et exporter. **Aucune
donnée n'est supprimée.**

Un point de conception qui compte : **le statut est recalculé à partir des
dates à chaque lecture**, pas lu tel quel en base. Si la tâche planifiée ne
tourne pas — panne, oubli de configuration, quota Vercel — une boutique échue
apparaît quand même comme échue. La tâche ne fait que persister le résultat
pour que la console soit juste.

---

## 4. Le renouvellement

À J-3 de l'échéance, le passage quotidien crée la facture et demande un lien
de paiement à Djomy. Le marchand le retrouve dans **Abonnement**, en haut de
page, et paie depuis son téléphone. Le webhook encaisse et prolonge la période
de 30 jours.

⚠️ **Ce n'est pas un prélèvement automatique.** L'API Djomy que j'ai lue ne
propose ni mandat ni tokenisation : impossible de débiter un marchand sans son
action. Si tu leur confirmes l'existence d'un mécanisme récurrent, seule la
fonction `createPaymentLink` de `src/lib/billing.ts` sera à revoir.

Deux garde-fous côté console :

- **Marquer réglée** — pour un virement ou un règlement en espèces reçu hors
  application
- **Lancer le passage de facturation** — pour déclencher le cycle à la main,
  sans attendre 6 h du matin

---

## 5. Les quotas

Contrôlés au moment de créer, jamais rétroactivement : un marchand qui
rétrograde d'offre garde ses 400 produits, il ne peut simplement plus en
ajouter. Supprimer des données de quelqu'un parce qu'il change d'offre serait
indéfendable.

Les fonctions non comprises renvoient un 404 sur leurs pages
(`/admin/factures`, `/admin/commandes`) et affichent un renvoi vers les offres
là où c'est utile (domaine personnalisé). La commande en ligne est refusée
côté serveur, même si le marchand a laissé le réglage actif : **l'abonnement
fait autorité sur les réglages.**

---

## 6. Vérifications

Typecheck et ESLint au vert. La logique d'abonnement est couverte par un jeu
de tests sur les fonctions pures — 20 cas, tous passants : transitions de
statut, bornes exactes de la période de grâce, statut périmé corrigé à la
lecture, quotas à la limite, messages d'avertissement.

À contrôler à la main une fois en ligne :

- [ ] créer une boutique de test, avancer `currentPeriodEnd` dans le passé en
      base, vérifier le bandeau puis la fermeture après 7 jours
- [ ] déclencher le passage depuis la console et lire le compte rendu
- [ ] vérifier qu'un appel à `/api/abonnement/cycle` sans `CRON_SECRET`
      renvoie bien 401

---

## 7. Ce qui manque encore

Le sujet reste ouvert côté **produit**, pas côté facturation :

- pas d'email de relance à l'approche de l'échéance — le marchand doit ouvrir
  son back-office pour voir le bandeau. C'est le manque le plus gênant de
  cette phase, et il dépend du chantier « emails »
- le changement d'offre passe par la console, pas en libre-service
- pas de proratisation en cas de changement en cours de période
- pas de facture PDF pour l'abonnement lui-même
- résiliation à la demande du marchand non implémentée

Et le rappel de la discussion précédente : **avant d'ouvrir à un deuxième
client, fais tourner Bilale & Danedjo dessus pendant un mois.** Facturer un
produit que personne n'a encore utilisé en conditions réelles, c'est prendre
le risque de découvrir ses défauts en même temps que ses clients.
