/**
 * Tests de `src/lib/blocks.ts`.
 *
 * Ce fichier est la frontière de confiance de la composition d'accueil : tout
 * ce qui sort de la base ou d'un formulaire y passe. On vérifie donc surtout
 * les entrées hostiles ou abîmées, pas le cas nominal.
 *
 *   npm run test:blocks
 */

import {
  parseBlocks,
  parseThemePreset,
  presetStyle,
  defaultBlocks,
  newBlock,
} from "../src/lib/blocks.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(label);
  }
}

// ------------------------------------------------------------- valeurs vides

check("null → composition par défaut", parseBlocks(null).length === defaultBlocks().length);
check("undefined → défaut", parseBlocks(undefined).length > 0);
check("tableau vide → défaut", parseBlocks([]).length > 0);
check("objet → défaut", parseBlocks({ type: "hero" }).length > 0);
check("chaîne → défaut", parseBlocks("hero").length > 0);
check("nombre → défaut", parseBlocks(42).length > 0);

// --------------------------------------------------------- entrées abîmées

check(
  "élément null écarté",
  parseBlocks([null, { type: "hero" }]).length === 1
);
check(
  "type inconnu écarté",
  parseBlocks([{ type: "script" }, { type: "hero" }]).length === 1
);
check(
  "type absent écarté",
  parseBlocks([{ props: {} }, { type: "hero" }]).length === 1
);
check(
  "tout inconnu → défaut",
  parseBlocks([{ type: "iframe" }, { type: "embed" }]).length ===
    defaultBlocks().length
);
check("props absents tolérés", parseBlocks([{ type: "hero" }])[0].props !== undefined);
check(
  "props non-objet toléré",
  parseBlocks([{ type: "texte", props: "coucou" }])[0].props.title === undefined
);
check(
  "visible par défaut à vrai",
  parseBlocks([{ type: "hero" }])[0].visible === true
);
check(
  "visible: false conservé",
  parseBlocks([{ type: "hero", visible: false }])[0].visible === false
);

// ------------------------------------------------------------ liens hostiles

const href = (value) =>
  parseBlocks([{ type: "texte", props: { title: "T", buttonHref: value } }])[0]
    .props.buttonHref;

check("javascript: refusé", href("javascript:alert(1)") === undefined);
check("JaVaScRiPt: refusé", href("JaVaScRiPt:alert(1)") === undefined);
check("data: refusé", href("data:text/html,<script>") === undefined);
check("vbscript: refusé", href("vbscript:msgbox") === undefined);
check("http:// refusé (mixed content)", href("http://exemple.com") === undefined);
check("file:// refusé", href("file:///etc/passwd") === undefined);
check("chemin interne accepté", href("/produits") === "/produits");
check("https accepté", href("https://exemple.com/a") === "https://exemple.com/a");
check("guillemet dans l'URL refusé", href('https://x.com/"onload="a') === undefined);
check("chevron dans l'URL refusé", href("https://x.com/<script>") === undefined);

// ------------------------------------------------------------ images

const img = (value) =>
  parseBlocks([{ type: "image", props: { imageUrl: value } }])[0].props.imageUrl;

check("image javascript: refusée", img("javascript:alert(1)") === undefined);
check("image data: refusée", img("data:image/svg+xml;base64,PHN2Zz4=") === undefined);
check("image https acceptée", img("https://cdn.test/a.jpg") === "https://cdn.test/a.jpg");

// ------------------------------------------------------------ bornes

const limit = (value) =>
  parseBlocks([{ type: "produits", props: { source: "populaires", limit: value } }])[0]
    .props.limit;

check("limite négative ramenée à 1", limit(-5) === 1);
check("limite zéro ramenée à 1", limit(0) === 1);
check("limite énorme plafonnée à 24", limit(100000) === 24);
check("limite décimale arrondie", limit(7.6) === 8);
check("limite texte ignorée", limit("beaucoup") === undefined);
check("limite NaN ignorée", limit(NaN) === undefined);
check("limite Infinity ignorée", limit(Infinity) === undefined);

const longTitle = "a".repeat(5000);
check(
  "titre tronqué à 120",
  parseBlocks([{ type: "texte", props: { title: longTitle } }])[0].props.title
    .length === 120
);
check(
  "texte tronqué à 2000",
  parseBlocks([{ type: "texte", props: { body: "b".repeat(9000) } }])[0].props.body
    .length === 2000
);
check(
  "espaces seuls → champ vide",
  parseBlocks([{ type: "texte", props: { title: "   " } }])[0].props.title ===
    undefined
);

const many = Array.from({ length: 200 }, () => ({ type: "texte", props: { title: "x" } }));
check("nombre de blocs plafonné à 20", parseBlocks(many).length === 20);

// --------------------------------------------------------- unicité et ordre

const doubled = parseBlocks([
  { type: "hero" },
  { type: "hero" },
  { type: "categories" },
  { type: "categories" },
]);
check("bloc unique dédoublonné", doubled.length === 2);
check(
  "blocs répétables conservés",
  parseBlocks([
    { type: "texte", props: { title: "un" } },
    { type: "texte", props: { title: "deux" } },
  ]).length === 2
);

const ordered = parseBlocks([
  { type: "appel", props: { title: "A" } },
  { type: "hero" },
  { type: "categories" },
]);
check("ordre préservé", ordered[0].type === "appel" && ordered[1].type === "hero");

check(
  "identifiant manquant remplacé",
  Boolean(parseBlocks([{ type: "hero" }])[0].id)
);
check(
  "identifiant tronqué à 40",
  parseBlocks([{ type: "hero", id: "z".repeat(300) }])[0].id.length === 40
);

// --------------------------------------------------- valeurs d'énumération

const source = (value) =>
  parseBlocks([{ type: "produits", props: { source: value } }])[0].props.source;
check("source inconnue ignorée", source("tout") === undefined);
check("source valide conservée", source("promotions") === "promotions");

const tone = (value) =>
  parseBlocks([{ type: "texte", props: { title: "T", tone: value } }])[0].props.tone;
check("fond inconnu ignoré", tone("arc-en-ciel") === undefined);
check("fond valide conservé", tone("fonce") === "fonce");
check(
  "fond avec injection CSS ignoré",
  tone("clair;}body{display:none}") === undefined
);

// ------------------------------------------------------------------ thèmes

check("thème inconnu → classique", parseThemePreset("hacker") === "classique");
check("thème null → classique", parseThemePreset(null) === "classique");
check("thème valide conservé", parseThemePreset("epure") === "epure");
check(
  "aucune valeur de thème ne contient d'accolade",
  ["classique", "epure", "chaleureux"].every((p) => !presetStyle(p).includes("}"))
);

// ------------------------------------------------------------ construction

check("newBlock produit un bloc valide", parseBlocks([newBlock("produits")]).length === 1);
check("newBlock donne des identifiants distincts", newBlock("texte").id !== newBlock("texte").id);
check("composition par défaut est stable", parseBlocks(defaultBlocks()).length === defaultBlocks().length);

// ------------------------------------------------------------------ verdict

console.log(`\n${passed} vérifications réussies`);
if (failures.length) {
  console.error(`\n${failures.length} échec(s) :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("Tout est au vert.\n");
