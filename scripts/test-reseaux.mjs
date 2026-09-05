/**
 * Tests des liens de réseaux sociaux.
 *
 * Ce que ces règles protègent : un lien affiché en pied de page de la boutique
 * d'un marchand. Un lien mort ou détourné vers un concurrent ne produit aucune
 * erreur — il s'affiche, et personne ne le voit avant un client.
 *
 *   npm run test:reseaux
 *
 * Aucune base de données : logique pure, exécutable partout.
 */

import {
  normaliserLien,
  normaliserTout,
  libelleCourt,
  PLATEFORMES,
  PLATEFORME_PAR_CLE,
} from "../src/lib/reseaux-sociaux.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

/** Attend un succès et une URL exacte. */
function attendre(cle, saisie, url) {
  const r = normaliserLien(cle, saisie);
  check(
    `${cle} « ${saisie || "(vide)"} » → ${url || "(vide)"}`,
    r.ok && r.url === url
  );
}

/** Attend un refus, avec un motif contenant un fragment donné. */
function refuser(cle, saisie, fragment) {
  const r = normaliserLien(cle, saisie);
  check(
    `${cle} « ${saisie} » refusé (${fragment})`,
    !r.ok && r.erreur.toLowerCase().includes(fragment.toLowerCase())
  );
}

// ------------------------------------------------------------ champ vide

attendre("facebook", "", "");
attendre("instagram", "   ", "");
check("un champ vide n'est pas une erreur", normaliserLien("tiktok", "").ok);

// --------------------------------------------------------------- pseudos

/*
 * Le cas qui motivait tout : un marchand tape son pseudo, pas une adresse.
 * L'ancienne normalisation en faisait « https://@maboutique », un lien mort
 * affiché tel quel en pied de page.
 */
attendre("instagram", "@maboutique", "https://instagram.com/maboutique");
attendre("instagram", "maboutique", "https://instagram.com/maboutique");
attendre("tiktok", "@ma.boutique", "https://tiktok.com/ma.boutique");
attendre("facebook", "MaBoutique224", "https://facebook.com/MaBoutique224");
attendre("instagram", "  @maboutique  ", "https://instagram.com/maboutique");
attendre("instagram", "ma_boutique-224", "https://instagram.com/ma_boutique-224");

refuser("instagram", "@ma boutique", "nom d'utilisateur");
refuser("instagram", "@", "nom d'utilisateur");

// --------------------------------------------------------------- adresses

attendre("facebook", "facebook.com/maboutique", "https://facebook.com/maboutique");
attendre(
  "facebook",
  "https://www.facebook.com/maboutique",
  "https://www.facebook.com/maboutique"
);
attendre(
  "instagram",
  "https://www.instagram.com/maboutique/",
  "https://www.instagram.com/maboutique"
);
attendre("tiktok", "https://vm.tiktok.com/ZM123/", "https://vm.tiktok.com/ZM123");

// La barre finale ne doit pas créer deux valeurs différentes pour un même lien.
check(
  "avec ou sans barre finale : même résultat",
  normaliserLien("facebook", "facebook.com/x").url ===
    normaliserLien("facebook", "facebook.com/x/").url
);

// Un fragment « #… » n'apporte rien et rend deux liens identiques différents.
check(
  "le fragment est retiré",
  normaliserLien("facebook", "facebook.com/x#abc").url ===
    "https://facebook.com/x"
);

// ------------------------------------------------- le mauvais champ

/*
 * Le défaut le plus visible pour un client : une icône Instagram qui mène
 * chez Facebook. Rien ne le détectait, et le message doit dire où ranger
 * l'adresse — pas seulement qu'elle est refusée.
 */
refuser("instagram", "https://facebook.com/maboutique", "lien Facebook");
refuser("facebook", "https://www.instagram.com/maboutique", "lien Instagram");
refuser("tiktok", "https://instagram.com/maboutique", "lien Instagram");

const croise = normaliserLien("instagram", "https://facebook.com/x");
check(
  "le refus dit dans quel champ ranger l'adresse",
  !croise.ok && croise.erreur.includes("champ Facebook")
);

// -------------------------------------------- domaine étranger au projet

refuser("facebook", "https://exemple.com/maboutique", "ne pointe pas vers Facebook");
refuser("instagram", "https://youtube.com/@x", "ne pointe pas vers Instagram");

// Un sous-domaine du bon réseau reste accepté.
attendre("facebook", "https://m.facebook.com/x", "https://m.facebook.com/x");

// ------------------------------------------------------- entrées hostiles

refuser("facebook", "javascript:alert(1)", "adresse");
refuser("facebook", "ftp://facebook.com/x", "adresses web");

/*
 * Une adresse qui contient le domaine attendu sans en être : un attaquant
 * qui enregistre « facebook.com.evil.tld » ne doit pas passer pour Facebook.
 */
refuser("facebook", "https://facebook.com.evil.tld/x", "ne pointe pas vers Facebook");
refuser("instagram", "https://notinstagram.com/x", "ne pointe pas vers Instagram");

// ------------------------------------------------------------- libellés

check(
  "libellé Instagram avec arobase",
  libelleCourt("instagram", "https://instagram.com/maboutique") === "@maboutique"
);
check(
  "libellé Facebook sans arobase",
  libelleCourt("facebook", "https://facebook.com/maboutique") === "maboutique"
);
check("libellé d'un lien vide", libelleCourt("facebook", "") === "");

// ------------------------------------------------------- normaliserTout

const tout = normaliserTout({
  facebook: "facebook.com/ok",
  instagram: "https://facebook.com/mauvais",
  tiktok: "",
});
check("les champs valides sont normalisés", tout.valeurs.facebook === "https://facebook.com/ok");
check("un champ vide reste vide", tout.valeurs.tiktok === "");
check("le champ fautif est signalé", Boolean(tout.erreurs.instagram));
check("les champs valides ne sont pas signalés", !tout.erreurs.facebook);
/*
 * On ne vide pas la saisie fautive : le marchand doit retrouver ce qu'il avait
 * tapé pour le corriger. Un champ remis à blanc lui fait perdre son travail et
 * l'oblige à retourner chercher l'adresse.
 */
check(
  "la saisie fautive est conservée telle quelle",
  tout.valeurs.instagram === "https://facebook.com/mauvais"
);

// ------------------------------------------------------------ cohérence

check("trois plateformes déclarées", PLATEFORMES.length === 3);
check(
  "chaque plateforme a une colonne Settings distincte",
  new Set(PLATEFORMES.map((p) => p.champ)).size === PLATEFORMES.length
);
check(
  "chaque plateforme a au moins un domaine",
  PLATEFORMES.every((p) => p.domaines.length > 0)
);
check(
  "l'index par clé couvre toutes les plateformes",
  PLATEFORMES.every((p) => PLATEFORME_PAR_CLE[p.key] === p)
);
/*
 * Deux réseaux ne doivent pas revendiquer le même domaine : la détection
 * « c'est un lien X, pas Y » deviendrait un tirage au sort.
 */
const tousDomaines = PLATEFORMES.flatMap((p) => p.domaines);
check(
  "aucun domaine partagé entre deux réseaux",
  new Set(tousDomaines).size === tousDomaines.length
);

// --------------------------------------------------------------- rapport

console.log(`\n${passed} vérification(s) réussie(s).`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} échec(s) :`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log("✅ Liens de réseaux sociaux vérifiés.\n");
