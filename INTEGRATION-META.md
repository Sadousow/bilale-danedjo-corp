# Connexion Meta Business — plan d'architecture

Document de cadrage. À valider avant d'écrire la moindre ligne de code.
Même méthode que [ARCHITECTURE-SAAS.md](ARCHITECTURE-SAAS.md) : le plan
d'abord, l'exécution par phases ensuite.

**Objet** — permettre à un marchand de connecter son compte Meta Business à
Guygou, pour que la plateforme agisse en son nom. Premier usage retenu : la
**synchronisation du catalogue produits**.

**Vocabulaire** — c'est le **marchand** (tenant) qui connecte son Meta
Business, pas le `Customer`. Rien de ce document ne concerne l'acheteur final.

---

## 1. ⚠️ Ce qui peut arrêter ce projet avant la première ligne de code

Trois questions ouvertes, hors de notre contrôle, à trancher **avant** tout
engagement de développement. Elles ne portent pas sur la faisabilité technique
— celle-là est acquise — mais sur le fait que Meta rende le service disponible
en Guinée et en francs guinéens.

### 1.1 GNF n'est pas une devise de compte publicitaire Meta

**Vérifié.** La liste officielle des devises de la Marketing API compte
64 entrées ; les seules en « G » sont **GBP** et **GTQ**. Le franc guinéen
n'y figure pas. Aucune devise ouest-africaine n'y figure (ni XOF, ni XAF).
Devises africaines présentes : DZD, EGP, KES, NGN, ZAR.

**Non vérifié** — il n'existe aucune liste publique des devises acceptées
**pour les prix de catalogue**, qui est un objet distinct du compte
publicitaire. La spécification dit seulement « the 3-letter ISO 4217 currency
code ». GNF *est* un code ISO 4217 valide (324, zéro décimale).

**À valider** : un item de catalogue au prix `50000 GNF` est-il accepté, ou
rejeté à l'import ? C'est la question qui décide de tout le reste. Un test
réel sur un catalogue vide y répond en dix minutes — bien avant d'écrire du
code.

Conséquence si GNF est refusé : il faudrait publier les prix dans une devise
supportée, donc convertir. Or la règle Meta veut que le prix du catalogue
corresponde au prix de la page d'atterrissage. Une conversion introduit donc
un écart permanent avec la boutique. **Ce serait rédhibitoire pour cet
usage.**

### 1.2 Les boutiques Meta ne semblent pas disponibles en Guinée

**Vérifié partiellement.** Deux sources secondaires indépendantes reproduisent
la même liste de pays éligibles à Instagram Shopping et au tag produit :
Amériques (BR, CA, MX, US), Europe (DK, FR, DE, IT, NL, NO, ES, SE, CH, UK,
UA), APAC (AU, IN, ID, JP, KR, TW, TH). **Aucun pays africain.** Une source de
janvier 2026 écrit explicitement que de nombreuses régions, « particulièrement
en Afrique », n'y ont toujours pas accès.

La liste officielle Meta n'a pas pu être lue : les pages du Business Help
Center sont bloquées aux robots. **Ce point repose donc sur du secondaire** et
doit être confirmé.

Vérifié par ailleurs : le Meta Payments Gateway est « available in the US
only ». Le paiement sur Meta est donc hors sujet quoi qu'il arrive.

**Conséquence si confirmé** : le bénéfice le plus vendeur — « vos produits
apparaissent dans votre boutique Instagram, taguables dans vos publications »
— **n'existe pas sur ce marché**. Ce qui reste utilisable d'un catalogue :

- les **publicités dynamiques / Advantage+ catalog ads** (aucune restriction
  géographique documentée trouvée, mais absence de preuve ≠ preuve d'absence)
- le retargeting produit via Pixel et Conversions API

C'est réel, mais ça n'intéresse que le marchand qui fait déjà de la publicité
payante. Ce n'est pas le petit commerçant de Conakry.

**Observation de terrain, 17 août 2026.** Une publicité carrousel de
`Arabinene.com` (35 K abonnés, « Sponsorisée ») circule en français avec des
fiches produit et un bouton « Commander » : c'est le format **publicité
catalogue**, alimenté par un catalogue Meta. Donc ce format fonctionne bel et
bien sur une audience francophone — ce qui conforte le §1.2 : même sans
boutique éligible, le catalogue sert les publicités dynamiques.

Deux limites à cette observation : une capture d'écran ne dit ni où le compte
publicitaire est domicilié, ni quel pays est ciblé. **Et surtout : les fiches
de cette annonce n'affichent aucun prix**, seulement le titre et le bouton.

Cette absence de prix mérite un test, parce qu'elle suggère une porte de
sortie si GNF est refusé à l'affichage. Attention cependant : `price` reste un
champ **obligatoire** du catalogue. Ne pas l'afficher sur la fiche ne dispense
pas de fournir une valeur valide, et publier un prix dans une devise qui ne
correspond pas à la page d'atterrissage reste contraire à la règle Meta. À
traiter comme une hypothèse à vérifier, pas comme un contournement acquis.

**Piste non explorée, potentiellement plus pertinente** : les **catalogues
WhatsApp Business**. Sur un marché où la vente se fait dans WhatsApp, un
catalogue consultable dans la conversation vaut peut-être plus qu'une boutique
Instagram. À investiguer avant d'arbitrer définitivement l'ordre des usages.

### 1.3 La vérification d'entreprise est obligatoire, et l'entité reste à choisir

**Vérifié.** Règle Meta directement applicable : « apps that allow other
Businesses to access their own data must be connected to a Business that has
completed Business Verification. » C'est exactement notre modèle. De plus, la
vérification s'applique à toute app demandant l'accès avancé.

Documents attendus (sources partenaires) : certificat d'immatriculation ou
registre du commerce, documents fiscaux, facture de services, relevé bancaire
professionnel. **Le français est accepté** pour les justificatifs.

**Non vérifié** : aucune contrainte propre à la Guinée n'a pu être confirmée
ni écartée. La table « documents par pays » trouvée ne couvre qu'une quinzaine
de pays, aucun africain — ce qui signifie qu'elle n'est pas exhaustive, pas
que la Guinée est exclue.

**À trancher** : quelle entité porte l'app. Guygou n'est pas une entité
enregistrée ; **Bilale et Danedjo Corporation SARLU** l'est, avec RCCM et NIF.
Utiliser cette entité est le chemin le plus court, mais lie administrativement
la plateforme à l'un de ses propres marchands. À décider en conscience.

### 1.4 Ordre de travail qui découle de tout ceci

**Créer l'app Meta et lancer la vérification d'entreprise dès maintenant, en
parallèle.** C'est le seul chemin critique que nous ne contrôlons pas : sans
accès avancé approuvé, aucun marchand ne peut être embarqué, et aucune
quantité de code n'y change quoi que ce soit.

Et **tester GNF sur un catalogue de test avant la phase 1.** Dix minutes qui
peuvent annuler le projet — ou le débloquer.

---

## 2. Ce que « connecter Meta Business » veut dire techniquement

Trois briques, dans cet ordre :

1. le marchand autorise Guygou sur ses actifs Meta (OAuth)
2. Guygou conserve un jeton durable et chiffré, par marchand
3. Guygou pousse le catalogue et écoute les retours par webhook

### Permissions à demander

| Permission | Pourquoi |
| ---------- | -------- |
| `catalog_management` | créer, lire, modifier, supprimer les catalogues du business |
| `business_management` | gérer les actifs du business — **requise pour écrire dans un catalogue** |

L'app doit être de type **Business**. Le tableau de bord Meta organise
désormais la création par « use cases » plutôt que par types : le use case
exact à sélectionner reste à confirmer au moment de la création.

**Accès avancé requis.** Règle générale vérifiée : « App Review is required
for all permissions except email and public_profile if your app needs access
to data that you do not own or manage. » C'est notre cas. Que
`catalog_management` l'exige formellement est **une déduction de cette règle**,
la fiche de permission n'ayant pas pu être chargée — à confirmer.

Tant que l'accès avancé n'est pas approuvé, seuls les développeurs et
administrateurs de l'app peuvent l'utiliser.

---

## 3. Flux de connexion

**Facebook Login for Business**, avec un **configuration ID** : on déclare à
l'avance, dans le tableau de bord, le type de jeton, les actifs demandés et
les permissions. Le config ID remplace ensuite le paramètre `scope` dans la
boîte de dialogue.

### Type de jeton — la décision structurante

La configuration offre deux choix, et la documentation les départage
explicitement :

| Type | Pour quoi, selon Meta |
| ---- | --------------------- |
| *User Access Token* | « if your app takes actions in real time, based on input from the user » |
| *Business Integration System User Access Token* | « if your app performs programmatic, automated actions on your business clients' assets » |

**On retient le jeton system user d'intégration business.** Une
synchronisation de catalogue est une action programmatique récurrente, pas une
action déclenchée par un humain présent devant son écran.

Durées de vie vérifiées : jeton utilisateur court ~1-2 h, jeton utilisateur
long ~60 jours, jeton system user **« defaults to never expire »** pour la
communication serveur à serveur hors ligne. Avertissement de Meta à prendre au
sérieux : « You should not depend on these lifetimes remaining the same — the
lifetime may change without warning or expire early. »

**Donc : traiter le jeton comme périssable même s'il est annoncé permanent.**
Stocker `tokenExpiresAt` nullable, gérer l'échec 401 comme un état normal, et
prévoir un écran « reconnecter » plutôt qu'une alerte technique.

Toutes les requêtes signées avec `appsecret_proof` — un HMAC-SHA256 du jeton
avec l'App Secret comme clé.

### Découverte des actifs

Après autorisation : `/owned_product_catalogs` et `/client_product_catalogs`
sur le business du marchand. Tâches assignables sur un catalogue : `MANAGE`,
`ADVERTISE`.

**Zone d'ombre à lever en phase 1** : la documentation couvre la *consultation*
des catalogues existants, pas la *création d'un catalogue au nom d'un business
tiers*. Deux parcours à départager au moment du prototype — soit Guygou crée
le catalogue, soit le marchand le crée dans son Commerce Manager et Guygou s'y
rattache. Le second est plus sûr à supposer, et plus laid à expliquer.

Si le marchand n'a **aucun** Business Manager, il faut en créer un avant toute
chose. C'est un cas fréquent chez un petit commerçant, et il doit être traité
dans le parcours, pas comme une erreur.

---

## 4. Nouveaux modèles

Hors `TENANT_SCOPED` : ce sont des tables de raccordement de plateforme, au
même titre que `TenantDomain`. Ne pas les ajouter au `Set` de
`src/lib/tenant-db.ts`.

```prisma
model TenantIntegration {
  id       String   @id @default(cuid())
  tenantId String
  provider IntegrationProvider          // META (extensible)

  businessId String                     // Business Manager du marchand

  /// Jeton system user, chiffré AES-256-GCM via src/lib/crypto.ts.
  /// Même mécanisme et même clé maître que les clés Djomy des marchands.
  accessToken    String
  tokenExpiresAt DateTime?              // nul = annoncé permanent, jamais supposé tel
  scopes         String[]

  status      IntegrationStatus @default(ACTIVE)
  connectedAt DateTime @default(now())
  lastErrorAt   DateTime?
  lastErrorCode String?

  assets MetaAsset[]

  @@unique([tenantId, provider])
  @@index([status])
}

enum IntegrationProvider { META }

/// DECONNECTE : le marchand a retiré l'accès depuis Meta (webhook de
/// désautorisation). EXPIRE : nos appels échouent en 401.
enum IntegrationStatus { ACTIVE DECONNECTE EXPIRE ERREUR }

model MetaAsset {
  id            String @id @default(cuid())
  integrationId String
  kind          MetaAssetKind
  externalId    String                  // catalog_id, page_id, ig_user_id…
  name          String @default("")

  /// La clé du démultiplexage des webhooks : Meta nous envoie un identifiant
  /// d'actif, cette contrainte le traduit en un tenant et un seul.
  @@unique([kind, externalId])
  @@index([integrationId])
}

enum MetaAssetKind { CATALOG PAGE INSTAGRAM WABA PHONE }

/// Journal de synchronisation — sans lui, tout diagnostic de support se fait
/// à l'aveugle sur la base du marchand.
model CatalogSyncRun {
  id            String @id @default(cuid())
  integrationId String
  mode          SyncMode              // FEED ou BATCH
  handle        String?               // renvoyé par items_batch, suivi du statut
  itemsSent     Int    @default(0)
  itemsFailed   Int    @default(0)
  status        SyncStatus @default(EN_COURS)
  startedAt     DateTime @default(now())
  finishedAt    DateTime?
  report        Json?

  @@index([integrationId, startedAt])
}

enum SyncMode { FEED BATCH }
enum SyncStatus { EN_COURS TERMINE ECHOUE }
```

`AuditAction` reçoit trois valeurs : `INTEGRATION_CONNECTEE`,
`INTEGRATION_DECONNECTEE`, `CATALOGUE_SYNCHRONISE`.

---

## 5. Alimentation du catalogue — deux canaux, pas un

C'est la partie où l'architecture se décide, à cause des limites de débit.

### Ce que disent les limites

Les appels `items_batch` sont plafonnés **par catalogue**, selon une formule
indexée sur le **trafic** du catalogue :

```
appels/minute = 8 + 8 × log2(impressions pubs dynamiques + visites fiches produit)
```

**Un marchand neuf a un trafic nul, donc un plancher de l'ordre de 8 appels
par minute.** Pour un parc de nombreux petits marchands, le plafond est bas et
s'applique à chacun séparément — ce n'est pas un pool global qu'on pourrait
lisser.

⚠️ **Deux pages Meta se contredisent** sur cette formule : la page Graph API
donne `8 + 8 × log2(...)` **par minute** sur « DA impressions + PDP visits »,
la page Marketing API donne `200 + 200 × log2(...)` **par heure** sur « unique
users ». À faire arbitrer avant de dimensionner la file.

Contraintes vérifiées d'`items_batch` : jusqu'à **5 000 items** par requête,
**≤ 3 000 recommandé**, charge utile **≤ 28 Mo**. `allow_upsert` vaut `true`
par défaut. **`POST /{catalog_id}/batch` est déprécié** — « no new
integrations » : n'utiliser que `items_batch`.

### Le design qui en découle

Meta recommande lui-même l'hybride : un instantané complet par flux de
données, et l'API batch réservée aux écarts de prix et de disponibilité.
(Recommandation issue d'un billet de 2018 — cohérente avec les limites
actuelles, mais son statut de doctrine courante n'est pas confirmé par une
source récente.)

| Canal | Rôle | Déclenchement |
| ----- | ---- | ------------- |
| **Flux de données** hébergé par Guygou | source de vérité, catalogue entier | récupéré par Meta, quotidien |
| **`items_batch`** | écarts urgents : prix, stock, retrait | à l'événement, mis en file |

Le flux est une route publique par marchand, en CSV ou XML, non indexée et
protégée par un jeton opaque en chemin :
`/api/meta/feed/[integrationId]/[secret].csv`. Elle n'expose que des produits
`active: true` — jamais le coût d'achat, jamais le stock chiffré.

Formats de flux vérifiés : CSV, TSV, XML. Fréquences programmables : horaire,
quotidienne, hebdomadaire. Tailles annoncées : 100 Mo en ponctuel, 8 Go en
flux programmé, jusqu'à 30 Go compressé — **chiffres issus d'une source
secondaire**, la page Meta officielle étant inaccessible aux robots.

**Ne jamais appeler l'API Meta depuis une Server Action.** Les quotas sont
partagés à l'échelle de l'app : un marchand qui enregistre trente produits
d'affilée ne doit pas consommer le débit des autres. Il faut une file avec une
part par tenant. Sans tâche de fond dans l'infrastructure actuelle, le point
de départ raisonnable est un cron Vercel supplémentaire qui dépile, sur le
modèle exact de `/api/abonnement/cycle` et de son `CRON_SECRET`.

---

## 6. Correspondance `Product` → item de catalogue

Champs obligatoires vérifiés côté Meta, et leur source côté Guygou :

| Champ Meta | Contrainte Meta | Source Guygou |
| ---------- | --------------- | ------------- |
| `id` | ≤ 100 car., « use the item's SKU if possible » | `Product.sku` |
| `title` | ≤ 200 car. (≤ 65 recommandé) | `Product.name` |
| `description` | ≤ 9 999 car. | `Product.description`, repli sur `name` si vide |
| `availability` | `in stock` / `out of stock`, **en anglais américain** | `stock > 0` |
| `condition` | `new` / `refurbished` / `used` | `new` en dur |
| `price` | « number, space, 3-letter ISO 4217 code », **point décimal**, pas de symbole | `` `${price} GNF` `` — voir §1.1 |
| `link` | URL de la fiche produit | host du tenant + `/produits/{sku}` |
| `image_link` | JPEG ou PNG, **≥ 500 × 500 px** | `Product.image` via `publicUrlFor()` |
| `brand` | ≤ 100 car. | `Settings.companyName` |

Quatre pièges dans ce tableau :

1. **`link` dépend du host du marchand**, donc de `TenantDomain` ou du
   sous-domaine. Une synchronisation hors requête HTTP n'a pas de `headers()`
   : l'URL de base doit être **résolue depuis la base**, pas depuis le
   contexte. C'est le même piège que les métadonnées, déjà traité en phase 2
   du multi-tenant.
2. **`image_link` exige 500 × 500 minimum.** Rien ne l'impose aujourd'hui au
   téléversement. Les produits déjà en base peuvent être sous ce seuil : il
   faut mesurer avant de promettre, et refuser proprement à la synchronisation
   plutôt que d'envoyer un item que Meta rejettera.
3. **`availability` s'écrit avec une espace** (`in stock`), là où Google
   utilise un tiret bas (`in_stock`). Piège de recopie si l'on part d'un
   exemple Google.
4. **Le prix est un entier GNF sans centimes** dans notre base. Le format Meta
   attend un nombre à point décimal : `50000 GNF` doit être émis tel quel,
   jamais reformaté par `format.ts`, qui produit des séparateurs de milliers
   destinés à l'affichage humain.

Zones à confirmer : le mapping exact `id` ↔ `retailer_id` (la référence des
champs et `items_batch` disent `id`, l'objet en lecture expose
`retailer_id`), et la liste exhaustive des valeurs `availability` — les
sources divergent au-delà des deux valeurs officielles.

---

## 7. Publication partielle — le marchand choisit ce qui sort

**Le catalogue Guygou n'est pas le catalogue Meta.** Un marchand ne veut pas
tout pousser : il a des articles d'appel, des articles qu'il ne veut pas voir
en publicité, des fiches incomplètes qu'il n'a pas envie d'exposer. La
publication est donc **opt-in, produit par produit**.

C'est aussi la position prudente : rien ne part avant une décision explicite.
Même philosophie que `Settings.shopPublished`, déjà à `false` par défaut parce
qu'« une boutique neuve n'a ni produit, ni logo, ni textes ».

### Modèle

```prisma
model MetaCatalogItem {
  id        String @id @default(cuid())
  productId String

  /// Décision du marchand. Faux par défaut : rien ne part sans un clic.
  published Boolean @default(false)

  syncStatus   ItemSyncStatus @default(EN_ATTENTE)
  lastSyncedAt DateTime?

  /// Motif de refus, en français, destiné au marchand — pas un code Meta brut.
  /// Sans ce champ, chaque rejet devient un ticket de support.
  rejectionMessage String @default("")

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, productId])
  @@index([tenantId, published])
}

enum ItemSyncStatus { EN_ATTENTE PUBLIE REJETE RETIRE }
```

⚠️ **`MetaCatalogItem` est un modèle métier : il porte `tenantId` et doit
entrer dans le `Set TENANT_SCOPED` de `src/lib/tenant-db.ts`.** C'est
exactement le cas prévu par la règle — un modèle oublié n'est filtré par rien,
et l'oubli est silencieux. À l'inverse de `TenantIntegration` et `MetaAsset`,
qui sont des tables de raccordement de plateforme et restent hors garde.

### Trois états à ne jamais confondre

| État | Portée | Effet |
| ---- | ------ | ----- |
| `Product.active` | boutique Guygou | l'article est visible et commandable |
| `Settings.shopPublished` | boutique entière | la vitrine est ouverte aux visiteurs |
| `MetaCatalogItem.published` | catalogue Meta | l'article part chez Meta |

Ils sont orthogonaux, et c'est là qu'est le piège : **un article publié sur
Meta mais désactivé dans la boutique donne une publicité qui mène à une page
vide.** Le marchand paie pour envoyer des gens dans le mur.

Deux règles qui en découlent, non négociables :

1. `published: true` exige `active: true`. La publication est refusée sinon.
2. **Désactiver un produit doit se propager à Meta** — passage en
   `out of stock`, pas simple oubli. Sinon l'annonce survit à l'article.

### Rupture de stock : `out of stock`, pas retrait

Décision prise. Un article en rupture reste dans le catalogue Meta, marqué
indisponible, et redevient disponible au réassort sans rien reconstruire.

La raison est publicitaire, pas technique : un retrait casse l'historique des
campagnes qui référencent l'article. Le marchand perdrait l'apprentissage
accumulé à chaque rupture — et les ruptures sont fréquentes chez un petit
commerçant.

Le retrait par `items_batch` reste réservé à deux cas : le marchand dépublie
explicitement, ou l'article est supprimé.

### Éligibilité : refuser avant Meta, pas après

Meta rejette silencieusement, en lot, avec des codes. Inacceptable pour un
marchand à Conakry. La condition doit être **calculée chez nous et affichée
avant** toute tentative :

| Condition | Source Meta | Message au marchand |
| --------- | ----------- | ------------------- |
| image présente | `image_link` obligatoire | « Ajoutez une photo » |
| image ≥ 500 × 500 px | seuil vérifié | « Photo trop petite (min. 500 × 500) » |
| description non vide | `description` obligatoire | « Ajoutez une description » |
| `price > 0` | `price` obligatoire | « Renseignez un prix » |
| `name` ≤ 200 car. | limite vérifiée | « Nom trop long » |
| `active: true` | notre règle | « Activez d'abord l'article » |

⚠️ **Le seuil d'image a une conséquence non triviale.** `Product.image` est une
simple chaîne : les dimensions ne sont stockées nulle part. Il faut soit les
relever au téléversement et les ajouter au modèle (`imageWidth`,
`imageHeight`), soit les mesurer à la publication. La première option est la
bonne — elle rend l'éligibilité calculable sans appel réseau, donc affichable
dans la liste des produits. Elle implique de toucher le flux de
`src/lib/storage.ts`. À mesurer d'abord : combien de produits déjà en base
passent ce seuil ? Si la majorité échoue, la fonctionnalité s'ouvre sur un
mur.

### Écran

Pas de page séparée. **Le marchand pense à son catalogue, pas à ses
« intégrations »** : la sélection vit dans `/admin/produits`, qui a déjà des
filtres d'état (`?etat=actifs|inactifs`).

- une colonne « Meta » : publié, non publié, ou non publiable avec l'infobulle
  du motif
- une case à cocher par ligne et une action de lot « publier la sélection »
- un filtre `?meta=publies|non-publies|non-publiables`
- un compteur en tête : « 12 des 40 articles publiés sur Meta »

L'écran `/admin/integrations` garde son rôle : la connexion, le catalogue
rattaché, la dernière synchronisation. Pas la sélection.

### Sémantique du flux — un piège à vérifier

Avec un flux programmé, **le flux fait loi** : n'y plus figurer *devrait*
suffire à retirer l'article au prochain passage. Deux réserves :

1. Entre deux récupérations, l'article dépublié reste vivant chez Meta. Une
   dépublication explicite doit donc **aussi** émettre un `DELETE` par
   `items_batch`, sans attendre.
2. **Non vérifié** : selon la configuration du flux, un article omis peut être
   supprimé ou simplement laissé tel quel. À tester avant de s'appuyer dessus,
   parce que la différence entre les deux, c'est un article fantôme qui
   continue d'être annoncé.

### Quota d'offre

Le nombre d'articles publiés est un candidat naturel pour `checkQuota()`, au
même titre que `productQuota()` et `userQuota()`. Ça permet une offre d'entrée
« 20 articles sur Meta » sans fermer la porte. À arbitrer avec la décision sur
la `PlanFeature` `integrations`.

---

## 8. Webhooks — l'inverse de Djomy, et c'est plus simple

Chez Djomy, la signature dépend du secret du marchand : impossible de vérifier
avant de savoir qui appelle, d'où l'URL par tenant
`/api/paiement/djomy/[tenantId]`.

**Meta signe avec un App Secret unique, au niveau de la plateforme.** Donc :

- **une seule route**, `/api/meta/webhook`
- signature vérifiable **immédiatement**, avant toute lecture de la base
- puis résolution du tenant depuis l'identifiant d'actif du corps, via
  `MetaAsset` — exactement le rôle que `TenantDomain` joue pour les hosts

Deux champs d'abonnement existent sur l'objet `Catalog`, et deux seulement :

| Champ | Charge utile | Usage |
| ----- | ------------ | ----- |
| `items_batch` | `catalog_id`, `handle`, `status` | `status: Finished` ; le `handle` interroge `/check_batch_request_status/` |
| `product_feed` | `catalog_id`, `product_feed_id`, `status` | fin de traitement d'un flux |

C'est ce qui évite d'interroger `check_batch_request_status` en boucle pour
chaque marchand. **Non documenté** : quelle permission ouvre l'abonnement aux
webhooks catalogue.

Cette route a besoin de `platformDb`, puisque le tenant n'est pas encore
connu. Elle doit donc entrer dans `PLATFORM_DB_ALLOWED` de
`eslint.config.mjs` — **avec un commentaire disant pourquoi**, comme les
autres entrées légitimes.

### Rappels obligatoires

**Suppression de données** — requis pour toute app accédant à des données
utilisateur. Meta accepte l'un des deux : une URL de rappel programmatique,
qui doit renvoyer `{ url, confirmation_code }`, ou une URL d'instructions
statique. La seconde suffit pour démarrer et coûte une page.

**Désautorisation** — le marchand peut couper l'accès depuis Meta sans passer
par Guygou. Il faut l'apprendre, basculer l'intégration en `DECONNECTE` et
cesser d'appeler, plutôt que de boucler sur un jeton mort. **Le caractère
formellement obligatoire de ce rappel n'a pas pu être confirmé** — mais son
utilité, elle, ne se discute pas.

---

## 9. Écrans

**Marchand** — `/admin/integrations`, `requireRole("ADMIN")` : état de la
connexion, bouton connecter/déconnecter, catalogue rattaché, date et résultat
de la dernière synchronisation, liste lisible des produits refusés et de leur
motif. Ce dernier point est le plus important pour le support : sans lui,
chaque échec devient un ticket.

**Plateforme** — une colonne « Meta » dans `/superadmin/boutiques`, et le
détail par boutique : statut, dernière erreur, historique des
`CatalogSyncRun`. Les trois `AuditAction` nouvelles apparaissent dans
`/superadmin/journal`.

**Offre** — nouvelle `PlanFeature` `integrations`, à côté de `shop`,
`invoicing` et `domain`. Contrairement aux liens sociaux, une intégration
consomme du quota d'API partagé et génère du support : elle a sa place dans
une offre payante. Décision à prendre maintenant, c'est une migration de
`Plan`.

**Sécurité** — `security-headers.ts` à ouvrir vers `facebook.com` si la boîte
de dialogue passe par le SDK JS ou une iframe. À éviter si un simple aller-
retour OAuth serveur suffit : moins de CSP à relâcher.

---

## 10. Découpage en phases

| Phase | Contenu | Livrable vérifiable |
| ----- | ------- | ------------------- |
| **0. Faisabilité** | App Meta créée, entité choisie, vérification d'entreprise lancée, **test GNF sur un catalogue vide**, éligibilité Guinée confirmée auprès de Meta | Une réponse écrite aux trois questions du §1 — go / no-go |
| **1. Raccordement** | `TenantIntegration`, `MetaAsset`, chiffrement du jeton, OAuth FL4B, écran marchand, déconnexion | Un marchand connecte son business et voit ses catalogues |
| **2. Sélection** | `MetaCatalogItem`, dimensions d'image au téléversement, calcul d'éligibilité, colonne et action de lot dans `/admin/produits` | Le marchand publie 3 articles sur 40 et voit pourquoi les autres ne peuvent pas l'être — sans qu'aucun appel Meta n'ait lieu |
| **3. Flux** | route de flux par marchand, mapping `Product`, déclaration du flux chez Meta, `CatalogSyncRun` | Seuls les articles sélectionnés apparaissent chez Meta |
| **4. Écarts** | file d'attente, `items_batch` sur prix, stock et dépublication, webhooks `items_batch` et `product_feed`, rapport d'erreurs lisible | Un changement de prix se propage sans synchronisation complète ; une dépublication retire l'article tout de suite |
| **5. Exploitation** | colonne console, audit, `PlanFeature`, quota d'articles publiés, rappels suppression et désautorisation, dégradation sur jeton mort | Un marchand révoque depuis Meta : Guygou le détecte et cesse d'appeler |

La phase 2 a une propriété intéressante : **elle ne dépend d'aucune réponse de
Meta.** Sélection, éligibilité, dimensions d'image, écran — tout est local et
testable pendant que la vérification d'entreprise avance. C'est le travail à
faire pendant l'attente.

**Ne rien annoncer commercialement avant la fin de la phase 3**, et rien du
tout avant que la phase 0 ait répondu.

---

## 11. Points de vigilance

**Le quota d'API est partagé par toute la plateforme.** C'est la différence de
nature avec Djomy, où chaque marchand a ses propres clés et donc ses propres
limites. Ici, un marchand mal codé — ou simplement gros — dégrade le service
des autres. La file par tenant n'est pas une optimisation, c'est une condition
de correction.

**Le jeton annoncé permanent ne l'est pas.** Meta le dit lui-même. Tout code
qui suppose qu'un jeton valide aujourd'hui le sera demain produira une panne
silencieuse : le catalogue cesse de se mettre à jour, personne ne le voit, les
prix affichés sur Meta divergent de la boutique.

**Un catalogue divergent est pire qu'un catalogue absent.** Un prix périmé sur
Meta engage le marchand devant son acheteur. Mieux vaut retirer les items en
cas d'échec prolongé que de laisser vivre des données fausses — décision de
produit à prendre explicitement, pas par défaut.

**Le parcours doit absorber un marchand sans Business Manager**, sans compte
Instagram professionnel, sans catalogue. C'est le cas majoritaire, pas
l'exception.

**Un article publié sur Meta et désactivé dans la boutique est un budget
publicitaire jeté.** C'est le défaut le plus probable de cette fonctionnalité,
parce qu'il ne produit aucune erreur : tout fonctionne, l'annonce tourne, et
elle mène nulle part. La propagation de la désactivation vers Meta n'est pas
un raffinement, c'est la fonctionnalité.

**Ne pas confondre ce chantier avec les liens sociaux.** `Settings` porte déjà
`socialFacebook`, `socialInstagram`, `socialTiktok`, saisis dans
`/admin/apparence` et affichés en pied de page. Ce sont des liens sortants,
sans jeton et sans Meta. Les deux sujets coexistent et ne se remplacent pas.

---

## 12. Ce que je te demande de valider

1. **GNF est-il accepté comme prix de catalogue ?** Test réel, avant tout code.
2. **Quels services Meta sont réellement ouverts en Guinée ?** Si les
   boutiques ne le sont pas, l'usage retenu perd son argument de vente et il
   faut regarder les catalogues WhatsApp Business avant de continuer.
3. **Quelle entité porte l'app Meta** — Bilale et Danedjo Corporation SARLU,
   ou une entité Guygou à créer.
4. **Le jeton system user d'intégration business** comme choix de
   configuration, et le principe de le traiter comme périssable.
5. **Le design hybride** : flux quotidien comme source de vérité, `items_batch`
   pour les écarts, jamais d'appel Meta depuis une Server Action.
6. **`integrations` comme fonctionnalité d'offre payante**, ou incluse partout —
   et faut-il un quota d'articles publiés.
7. **La publication est opt-in par article**, avec éligibilité calculée chez
   nous et affichée avant toute tentative. Implique de relever les dimensions
   d'image au téléversement.

---

## Sources

Documentation Meta consultée le 17 août 2026. Les pages du Business Help
Center et de l'aide Instagram sont bloquées aux robots : les points qui en
dépendent — liste des pays, devises de commerce, documents de vérification —
reposent sur des sources secondaires et sont signalés comme tels dans le
texte.

- [Get Started — Catalog (Marketing API)](https://developers.facebook.com/docs/marketing-api/catalog/get-started/)
- [Catalog Reference — champs produits](https://developers.facebook.com/docs/marketing-api/catalog/reference/)
- [items_batch — référence](https://developers.facebook.com/docs/marketing-api/reference/product-catalog/items_batch/)
- [Catalog Batch API — guide](https://developers.facebook.com/docs/marketing-api/catalog/guides/manage-catalog-items/catalog-batch-api/)
- [Graph API — rate limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)
- [Marketing API — rate limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)
- [Marketing API — currencies](https://developers.facebook.com/docs/marketing-api/currencies)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)
- [Access Tokens — guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [On Behalf Of — Business Management APIs](https://developers.facebook.com/docs/business-management-apis/business-manager/guides/on-behalf-of/)
- [Business Asset Management — Catalog](https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/catalog/)
- [Webhooks — référence](https://developers.facebook.com/docs/graph-api/webhooks/reference/) · [Catalog webhook](https://developers.facebook.com/docs/graph-api/webhooks/reference/catalog/)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)
- [Business Verification](https://developers.facebook.com/docs/development/release/business-verification)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [App Types](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/app-types/)
- [Commerce Platform](https://developers.facebook.com/docs/commerce-platform/)
- [Best Practices to Integrate Your Product Catalog System (2018)](https://developers.facebook.com/ads/blog/post/v2/2018/05/17/integrate-product-catalog-system/)
- [Onsite Checkout Payments T&C — Meta Payments Gateway US only](https://transparency.meta.com/policies/other-policies/terms-of-service/)

Sources secondaires : [Ecwid — pays Instagram Shopping](https://support.ecwid.com/hc/en-us/articles/360000629245-Tagging-products-on-Instagram-by-Meta) · [Smash Balloon, janvier 2026](https://smashballoon.com/instagram-shopping-not-available-in-your-region/) · [GoDataFeed — specs de flux](https://help.godatafeed.com/hc/en-us/articles/360048361091-Feed-Facebook-Meta-Facebook-Data-Feed-Specifications-for-Catalogs) · [360dialog — vérification d'entreprise](https://docs.360dialog.com/docs/resources/meta-business-verification) · [Wati — documents par pays](https://support.wati.io/en/articles/11463208-meta-business-verification-required-documents-by-country) · [productfeedspec.com — catalogue Meta](https://productfeedspec.com/platforms/meta-catalog)
