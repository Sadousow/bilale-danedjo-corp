/**
 * Tests du catalogue Meta : éligibilité et état affiché.
 *
 * Ce que ces règles protègent : ce qui part chez Meta au nom du marchand, et
 * ce qu'il voit dans sa liste de produits. Deux défauts silencieux à couvrir —
 * un article publié qui ne remplit plus les conditions (publicité qui mène à
 * une page vide), et un article déclaré non publiable à tort (le marchand ne
 * peut plus le vendre sur Meta sans comprendre pourquoi).
 *
 *   npm run test:meta
 *
 * Aucune base de données : logique pure, exécutable partout.
 */

import {
  eligibility,
  estPubliable,
  etatMeta,
  estSelectionnable,
  MIN_IMAGE_SIDE,
  MAX_TITLE_LENGTH,
} from "../src/lib/meta-catalog.ts";
import { messageAction } from "../src/lib/messages-meta.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

/** Un article parfaitement publiable, dont chaque test dégrade un aspect. */
const BON = {
  name: "Riz parfumé 25 kg",
  description: "Sac de riz parfumé importé, qualité supérieure.",
  image: "https://images.exemple.com/riz.jpg",
  imageWidth: 1200,
  imageHeight: 1200,
  price: 350000,
  active: true,
};

const avec = (modifs) => ({ ...BON, ...modifs });

// ═══════════════════════════════════════════════════ éligibilité

check("un article complet est publiable", eligibility(BON).publiable);
check("estPubliable est cohérent avec eligibility", estPubliable(BON));
check("aucune réserve sur un article complet", eligibility(BON).reserve === null);

/*
 * L'ordre des refus n'est pas cosmétique : le marchand doit savoir par quoi
 * commencer. Activer l'article passe avant soigner sa fiche — inutile de lui
 * demander une photo pour un article qu'il a lui-même désactivé.
 */
const inactifSansRien = eligibility(
  avec({ active: false, image: "", description: "", price: 0 })
);
check("l'inactivité est signalée en premier", !inactifSansRien.publiable && inactifSansRien.champ === "actif");

const refusImage = eligibility(avec({ image: "" }));
check("sans image : refusé", !refusImage.publiable && refusImage.champ === "image");
check("le motif dit quoi faire", refusImage.motif.toLowerCase().includes("photo"));

const refusDesc = eligibility(avec({ description: "   " }));
check("description vide : refusé", !refusDesc.publiable && refusDesc.champ === "description");

const refusPrix = eligibility(avec({ price: 0 }));
check("prix nul : refusé", !refusPrix.publiable && refusPrix.champ === "prix");
check("prix négatif : refusé", !eligibility(avec({ price: -1 })).publiable);

const refusNom = eligibility(avec({ name: "x".repeat(MAX_TITLE_LENGTH + 1) }));
check("nom trop long : refusé", !refusNom.publiable && refusNom.champ === "nom");
check("nom pile à la limite : accepté", eligibility(avec({ name: "x".repeat(MAX_TITLE_LENGTH) })).publiable);

// ─────────────────────────────────────────── le seuil d'image

/*
 * Le seuil de Meta est « au moins 500 × 500 ». Une comparaison stricte au lieu
 * de large refuserait exactement les images conformes de 500 px, qui sont
 * précisément celles qu'un marchand produit en visant la consigne.
 */
check("500 × 500 pile : accepté", eligibility(avec({ imageWidth: MIN_IMAGE_SIDE, imageHeight: MIN_IMAGE_SIDE })).publiable);
check("499 de large : refusé", !eligibility(avec({ imageWidth: 499, imageHeight: 800 })).publiable);
check("499 de haut : refusé", !eligibility(avec({ imageWidth: 800, imageHeight: 499 })).publiable);

const petite = eligibility(avec({ imageWidth: 320, imageHeight: 240 }));
check("le refus donne les dimensions réelles", petite.motif.includes("320") && petite.motif.includes("240"));
check("le refus rappelle le seuil", petite.motif.includes(String(MIN_IMAGE_SIDE)));

/*
 * Dimensions inconnues ≠ trop petites. C'est le cas de tous les produits créés
 * avant la colonne. Les bloquer d'office rendrait le catalogue entier
 * impubliable du jour au lendemain, ce qui serait faux pour la plupart.
 */
const inconnues = eligibility(avec({ imageWidth: null, imageHeight: null }));
check("dimensions inconnues : publiable", inconnues.publiable);
check("dimensions inconnues : avec réserve", inconnues.publiable && inconnues.reserve !== null);
check("une seule dimension connue : traité comme inconnu", eligibility(avec({ imageHeight: null })).publiable);

// ═══════════════════════════════════════════════ état affiché

const itemPublie = { published: true, syncStatus: "PUBLIE", rejectionMessage: "" };
const itemAttente = { published: true, syncStatus: "EN_ATTENTE", rejectionMessage: "" };
const itemRejete = { published: true, syncStatus: "REJETE", rejectionMessage: "Image refusée par Meta." };
const itemRetire = { published: false, syncStatus: "PUBLIE", rejectionMessage: "" };

check("jamais publié : non publié", etatMeta(BON, null).cle === "publiable");
check("publié et synchronisé", etatMeta(BON, itemPublie).cle === "publie");
check("publié, pas encore envoyé", etatMeta(BON, itemAttente).texte === "En attente");
check("refusé par Meta", etatMeta(BON, itemRejete).cle === "rejete");
check("le motif de Meta est repris", etatMeta(BON, itemRejete).detail.includes("Image refusée"));

/*
 * Le croisement dangereux : publié chez Meta, désactivé dans la boutique. La
 * publicité tourne et mène à une page vide. Rien n'échoue, rien n'alerte —
 * sauf cet état.
 */
const bloque = etatMeta(avec({ active: false }), itemPublie);
check("publié + inactif = bloqué", bloque.cle === "bloque");
check("bloqué est une alerte", bloque.alerte);
check("bloqué explique pourquoi", bloque.detail && bloque.detail.length > 0);

const bloqueImage = etatMeta(avec({ imageWidth: 100, imageHeight: 100 }), itemPublie);
check("publié + image trop petite = bloqué", bloqueImage.cle === "bloque");

check("bloqué prime sur rejeté", etatMeta(avec({ active: false }), itemRejete).cle === "bloque");
check("non publiable et non publié", etatMeta(avec({ image: "" }), null).cle === "impossible");
check("dépublié mais encore chez Meta : non publié", etatMeta(BON, itemRetire).cle === "publiable");

/*
 * Seuls « bloqué » et « refusé » demandent une action. Marquer aussi les états
 * normaux noierait les deux qui comptent — 200 articles tous signalés, c'est
 * aucun article signalé.
 */
check("publié n'alerte pas", !etatMeta(BON, itemPublie).alerte);
check("non publié n'alerte pas", !etatMeta(BON, null).alerte);
check("non publiable n'alerte pas", !etatMeta(avec({ image: "" }), null).alerte);
check("refusé alerte", etatMeta(BON, itemRejete).alerte);

const etats = ["publie", "bloque", "rejete", "publiable", "impossible"];
check("tout état a un texte non vide", [
  etatMeta(BON, itemPublie), etatMeta(avec({ active: false }), itemPublie),
  etatMeta(BON, itemRejete), etatMeta(BON, null), etatMeta(avec({ image: "" }), null),
].every((e) => e.texte && etats.includes(e.cle)));

// ═══════════════════════════════════════════ sélectionnable

check("un article publiable est sélectionnable", estSelectionnable(BON, null));
check("un article non publiable ne l'est pas", !estSelectionnable(avec({ image: "" }), null));

/*
 * Le cas qui coince : un article bloqué doit rester sélectionnable, sinon le
 * marchand ne peut plus le dépublier. Il resterait chez Meta indéfiniment,
 * sans aucun moyen de le retirer depuis le back-office.
 */
check("un article bloqué reste dépublianble", estSelectionnable(avec({ active: false }), itemPublie));
check("un article publié et sain est sélectionnable", estSelectionnable(BON, itemPublie));

// ═══════════════════════════════════════════ comptes rendus

/*
 * Le compte rendu voyage dans l'URL : il vient donc de l'utilisateur. Une
 * valeur inconnue ou trafiquée ne doit produire aucun message — jamais un
 * message faux, et jamais une erreur de rendu.
 */
check("pas de paramètre : pas de message", messageAction(undefined) === null);
check("paramètre vide : pas de message", messageAction("") === null);
check("paramètre inconnu : pas de message", messageAction("nimportequoi") === null);
check("paramètre trafiqué : pas de message", messageAction("publies-x-y") === null);
check("paramètre partiel : pas de message", messageAction("publies-3") === null);

const un = messageAction("publies-1-0");
check("1 publié : succès", un.ton === "succes" && un.texte.startsWith("1 article "));
check("le succès dit que rien n'est envoyé", un.texte.includes("connexion Meta"));

const plusieurs = messageAction("publies-4-0");
check("4 publiés : pluriel correct", plusieurs.texte.startsWith("4 articles marqués"));

/*
 * Le cas mixte est celui qui trompe : annoncer seulement les réussites
 * laisserait croire que toute la sélection est partie.
 */
const mixte = messageAction("publies-3-2");
check("cas mixte : ton d'avertissement", mixte.ton === "avertissement");
check("cas mixte : les deux nombres sont dits", mixte.texte.includes("3") && mixte.texte.includes("2"));

const aucun = messageAction("publies-0-5");
check("aucun publié : avertissement", aucun.ton === "avertissement");
check("aucun publié : dit combien sont refusés", aucun.texte.includes("5"));

check("0 et 0 : avertissement", messageAction("publies-0-0").ton === "avertissement");

const retire = messageAction("retires-2");
check("2 retirés : succès", retire.ton === "succes" && retire.texte.includes("2 articles"));
check("0 retiré : avertissement", messageAction("retires-0").ton === "avertissement");

check("sélection vide : avertissement", messageAction("aucune-selection").ton === "avertissement");
check("non publiable : avertissement", messageAction("non-publiable").ton === "avertissement");
check("introuvable : avertissement", messageAction("introuvable").ton === "avertissement");

// ═══════════════════════════════════════════════════ rapport

console.log(`\n${passed} vérification(s) réussie(s).`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} échec(s) :`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log("✅ Catalogue Meta vérifié.\n");
