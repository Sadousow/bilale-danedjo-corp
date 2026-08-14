/**
 * Tests de `src/lib/security-headers.ts`.
 *
 * Une CSP est facile à écrire et facile à affaiblir sans s'en rendre compte :
 * un `unsafe-inline` ajouté dans `script-src` pour débloquer une page annule
 * l'essentiel de la protection, et rien ne le signale. Ces tests fixent ce qui
 * ne doit pas bouger.
 *
 *   npm run test:securite
 */

import {
  contentSecurityPolicy,
  securityHeaders,
  cspHeaderName,
  isFramableBySelf,
  originOf,
} from "../src/lib/security-headers.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

const prod = {
  nonce: "abc123",
  isDev: false,
  storagePublicOrigin: "https://images.example.com",
  storageApiOrigin: "https://compte.r2.cloudflarestorage.com",
};

const dev = { ...prod, isDev: true };

const csp = contentSecurityPolicy(prod);
const cspDev = contentSecurityPolicy(dev);

/** Extrait une directive de la politique. */
function directive(policy, name) {
  const found = policy
    .split(";")
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(`${name} `));
  return found ?? "";
}

// ------------------------------------------------------------ script-src

const script = directive(csp, "script-src");

check("script-src contient le nonce", script.includes("'nonce-abc123'"));
check("script-src utilise strict-dynamic", script.includes("'strict-dynamic'"));
check("script-src refuse unsafe-inline", !script.includes("'unsafe-inline'"));
check("script-src refuse unsafe-eval en production", !script.includes("'unsafe-eval'"));
check(
  "script-src autorise unsafe-eval en développement",
  directive(cspDev, "script-src").includes("'unsafe-eval'")
);
check(
  "un nonce différent produit une politique différente",
  contentSecurityPolicy({ ...prod, nonce: "zzz" }) !== csp
);

// ------------------------------------------------------- directives dures

check("frame-ancestors none par défaut", directive(csp, "frame-ancestors") === "frame-ancestors 'none'");
check("object-src none", directive(csp, "object-src") === "object-src 'none'");
check("base-uri self", directive(csp, "base-uri") === "base-uri 'self'");
check("form-action self", directive(csp, "form-action") === "form-action 'self'");
check("default-src self", directive(csp, "default-src") === "default-src 'self'");

// ------------------------------------------------------------ stockage

check(
  "img-src autorise le bucket public",
  directive(csp, "img-src").includes("https://images.example.com")
);
check(
  "connect-src autorise l'API du bucket (téléversement direct)",
  directive(csp, "connect-src").includes("https://compte.r2.cloudflarestorage.com")
);
check(
  "connect-src refuse les websockets en production",
  !directive(csp, "connect-src").includes("ws:")
);
check(
  "connect-src autorise les websockets en développement",
  directive(cspDev, "connect-src").includes("ws:")
);

// Sans stockage configuré, la politique doit rester valide — pas de
// directive vide ni de double espace.
const sansStockage = contentSecurityPolicy({
  nonce: "n",
  isDev: false,
  storagePublicOrigin: null,
  storageApiOrigin: null,
});
check("politique valide sans stockage", !sansStockage.includes("  "));
check("aucune directive vide", !sansStockage.split(";").some((d) => d.trim() === ""));
check(
  "img-src reste utilisable sans stockage",
  directive(sansStockage, "img-src").includes("'self'")
);

// ------------------------------------------------------------ HTTPS forcé

check("upgrade-insecure-requests en production", csp.includes("upgrade-insecure-requests"));
check(
  "pas d'upgrade-insecure-requests en développement",
  !cspDev.includes("upgrade-insecure-requests")
);

// ------------------------------------------------------------ carte

check(
  "frame-src autorise la carte de la page Contact",
  directive(csp, "frame-src").includes("https://maps.google.com")
);
// Oubli constaté à la première mise en service : sans `'self'`, l'éditeur
// affiche un cadre vide et le navigateur ne dit rien de très parlant.
check(
  "frame-src autorise notre propre site (aperçu de l'éditeur)",
  directive(csp, "frame-src").includes("'self'")
);

// ------------------------------------------------------- autres en-têtes

const headers = securityHeaders(prod);
const headersDev = securityHeaders(dev);

check("nosniff", headers["X-Content-Type-Options"] === "nosniff");
check("X-Frame-Options DENY", headers["X-Frame-Options"] === "DENY");
check(
  "Referrer-Policy stricte",
  headers["Referrer-Policy"] === "strict-origin-when-cross-origin"
);
check("Permissions-Policy refuse la caméra", headers["Permissions-Policy"].includes("camera=()"));
check(
  "Permissions-Policy refuse la géolocalisation",
  headers["Permissions-Policy"].includes("geolocation=()")
);
check("COOP same-origin", headers["Cross-Origin-Opener-Policy"] === "same-origin");

check("HSTS en production", Boolean(headers["Strict-Transport-Security"]));
check(
  "HSTS couvre les sous-domaines (une boutique = un sous-domaine)",
  headers["Strict-Transport-Security"].includes("includeSubDomains")
);
check(
  "HSTS ne demande pas preload (décision difficile à défaire)",
  !headers["Strict-Transport-Security"].includes("preload")
);
check("pas de HSTS en développement", !headersDev["Strict-Transport-Security"]);

// ------------------------------------------- encadrement pour l'aperçu

/*
 * L'aperçu de l'éditeur affiche la vitrine dans un cadre. C'est la seule
 * raison d'assouplir `frame-ancestors`, et l'assouplissement doit rester
 * limité aux pages publiques : ce sont les écrans d'administration qui
 * portent les boutons dangereux.
 */
const vitrine = contentSecurityPolicy({ ...prod, framableBySelf: true });

check(
  "vitrine encadrable par la même origine",
  directive(vitrine, "frame-ancestors") === "frame-ancestors 'self'"
);
check(
  "X-Frame-Options suit : SAMEORIGIN sur la vitrine",
  securityHeaders({ ...prod, framableBySelf: true })["X-Frame-Options"] ===
    "SAMEORIGIN"
);
check("X-Frame-Options DENY ailleurs", headersDeny() === "DENY");

function headersDeny() {
  return securityHeaders({ ...prod, framableBySelf: false })["X-Frame-Options"];
}

check("vitrine encadrable", isFramableBySelf("/") === true);
check("catalogue encadrable", isFramableBySelf("/produits") === true);
check("contact encadrable", isFramableBySelf("/contact") === true);
check("back-office non encadrable", isFramableBySelf("/admin") === false);
check(
  "sous-page du back-office non encadrable",
  isFramableBySelf("/admin/apparence/accueil") === false
);
check("caisse non encadrable", isFramableBySelf("/pos") === false);
check("connexion non encadrable", isFramableBySelf("/login") === false);
check("plateforme non encadrable", isFramableBySelf("/plateforme") === false);
check(
  "console super-admin non encadrable",
  isFramableBySelf("/superadmin/connexion") === false
);
check(
  "une origine étrangère reste refusée dans les deux cas",
  !vitrine.includes("frame-ancestors *") && !vitrine.includes("https://")
    ? true
    : !directive(vitrine, "frame-ancestors").includes("*")
);

// ------------------------------------------------------- mode observation

const observation = securityHeaders({ ...prod, reportOnly: true });

check(
  "mode observation : en-tête Report-Only",
  Boolean(observation["Content-Security-Policy-Report-Only"])
);
check(
  "mode observation : aucun en-tête bloquant",
  !observation["Content-Security-Policy"]
);
check(
  "mode observation : même politique",
  observation["Content-Security-Policy-Report-Only"] === csp
);
check(
  "mode observation : les autres en-têtes restent actifs",
  observation["X-Content-Type-Options"] === "nosniff"
);
check("cspHeaderName par défaut bloque", cspHeaderName(false) === "Content-Security-Policy");

// ---------------------------------------------------------------- originOf

check("originOf lit une URL", originOf("https://a.example.com/chemin") === "https://a.example.com");
check("originOf tolère null", originOf(null) === null);
check("originOf tolère une valeur vide", originOf("") === null);
check("originOf tolère du texte", originOf("pas une url") === null);

// ------------------------------------------------------------------ verdict

console.log(`\n${passed} vérifications réussies`);
if (failures.length) {
  console.error(`\n${failures.length} échec(s) :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("Tout est au vert.\n");
