/**
 * Tests de la résolution d'hôte — la première décision de chaque requête.
 *
 * Plateforme, boutique, ou rien : tout le reste en dépend, y compris la
 * vérification de session. Cette logique n'était couverte par aucun test.
 *
 *   npx tsx scripts/test-hote.mjs
 */

process.env.NEXT_PUBLIC_ROOT_DOMAIN = "guygou.com";

const { classifyHost, isSlugAvailableFormat } = await import(
  "../src/lib/host.ts"
);

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ✗ ${name}\n      attendu : ${e}\n      obtenu  : ${a}`);
  }
}

const platform = { kind: "platform" };
const shop = (slug) => ({ kind: "subdomain", slug });
const custom = (host) => ({ kind: "custom", host });

// ------------------------------------------------------------- plateforme

console.log("\nZone plateforme");

check("domaine racine", classifyHost("guygou.com"), platform);
check("racine avec port", classifyHost("guygou.com:3000"), platform);
check("www de la racine", classifyHost("www.guygou.com"), platform);
check("casse ignorée", classifyHost("GuyGou.COM"), platform);
check("espaces ignorés", classifyHost("  guygou.com  "), platform);
// Un host vide vaut mieux plateforme que boutique inconnue : on préfère la
// vitrine à un 404 quand l'en-tête manque.
check("host absent", classifyHost(null), platform);
check("host vide", classifyHost(""), platform);
// Certains proxys empilent les hosts : « a.com, b.com ». Le premier fait foi.
check("liste de hosts : le premier gagne", classifyHost("guygou.com, autre.com"), platform);

// ------------------------------------------------------------- boutiques

console.log("Boutiques");

check("sous-domaine", classifyHost("bilale.guygou.com"), shop("bilale"));
check("sous-domaine avec port", classifyHost("bilale.guygou.com:3000"), shop("bilale"));
check("www devant la boutique", classifyHost("www.bilale.guygou.com"), shop("bilale"));
check("tiret dans le slug", classifyHost("chez-mariame.guygou.com"), shop("chez-mariame"));
check("domaine personnalisé", classifyHost("maboutique.gn"), custom("maboutique.gn"));

// ------------------------------------------------------------- réservés

console.log("Sous-domaines réservés");

for (const reserved of ["www", "api", "admin", "superadmin", "mail", "cdn"]) {
  check(`« ${reserved} » n'est pas une boutique`, classifyHost(`${reserved}.guygou.com`), platform);
}
// Deux niveaux ne désignent aucune boutique : le joker DNS ne descend pas
// plus bas, et laisser passer ouvrirait un slug fantaisiste.
check("sous-sous-domaine", classifyHost("a.b.guygou.com"), platform);

// ------------------------------------------------------------- aperçus Vercel

console.log("Aperçus Vercel");

// Le correctif : sans ce cas, chaque aperçu de branche affichait
// « cette boutique n'existe pas » sur toutes ses pages.
check(
  "aperçu de branche",
  classifyHost("bilale-danedjo-corp-git-feat-saas-e4e2d9-sows-projects.vercel.app"),
  platform
);
check("déploiement de production", classifyHost("guygou.vercel.app"), platform);
// Ce raccourci ne doit pas déborder sur un vrai domaine de marchand.
check(
  "un domaine qui contient vercel n'est pas concerné",
  classifyHost("vercel.app.maboutique.gn"),
  custom("vercel.app.maboutique.gn")
);
check(
  "domaine personnalisé normal, toujours reconnu",
  classifyHost("boutique-vercel.gn"),
  custom("boutique-vercel.gn")
);

// ------------------------------------------------------------- format de slug

console.log("Format des identifiants");

check("slug simple", isSlugAvailableFormat("bilale"), true);
check("slug avec tiret", isSlugAvailableFormat("chez-mariame"), true);
check("slug avec chiffres", isSlugAvailableFormat("boutique224"), true);
check("réservé refusé", isSlugAvailableFormat("admin"), false);
check("majuscules refusées", isSlugAvailableFormat("Bilale"), false);
check("point refusé", isSlugAvailableFormat("a.b"), false);
check("tiret en tête refusé", isSlugAvailableFormat("-bilale"), false);
check("tiret en fin refusé", isSlugAvailableFormat("bilale-"), false);
// Trois caractères au minimum : deux et un sont refusés. La limite vient de
// la forme du motif, pas d'une décision produit — elle est notée ici pour que
// personne ne la change par accident en croyant corriger un bogue.
check("trois caractères acceptés", isSlugAvailableFormat("abc"), true);
check("deux caractères refusés", isSlugAvailableFormat("ab"), false);
check("un seul caractère refusé", isSlugAvailableFormat("a"), false);
check("espace refusé", isSlugAvailableFormat("ma boutique"), false);
check("accent refusé", isSlugAvailableFormat("boutiqué"), false);

console.log(`\n${passed} test(s) réussi(s), ${failed} échec(s).\n`);
process.exit(failed > 0 ? 1 : 0);
