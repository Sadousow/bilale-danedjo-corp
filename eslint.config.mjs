import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Garde-fou multi-tenant : le client Prisma brut (`platformDb`) ne filtre
 * rien. Il n'est autorisé que dans les modules qui résolvent le tenant ou
 * qui manipulent les tables de plateforme. Partout ailleurs, on passe par
 * `db()` / `tenantDb()`, qui injectent le `tenantId`.
 */
const PLATFORM_DB_ALLOWED = [
  "src/lib/tenant.ts",
  "src/lib/tenant-db.ts",
  "src/lib/payment/tenant-djomy.ts",
  "src/lib/platform-auth.ts",
  "src/lib/provisioning.ts",
  "src/lib/subscription.ts",
  "src/lib/billing.ts",
  "src/lib/platform-stats.ts",
  "src/lib/platform-shops.ts",
  "src/lib/throttle.ts",
  "src/lib/password-reset.ts",
  "src/lib/reset-flow.ts",
  "src/lib/messaging/subscription-notice.ts",
  "src/lib/email-verification.ts",
  "src/app/api/impersonation/**",
  // Tables de plateforme : domaines, clés de paiement, compteurs de boutiques
  "src/app/admin/parametres/page.tsx",
  "src/app/admin/abonnement/**",
  "src/app/api/abonnement/**",
  "src/app/admin/parametres/domaines-actions.ts",
  "src/app/admin/parametres/paiement-actions.ts",
  "src/app/plateforme/**",
  "src/app/superadmin/**",
  "prisma/**",
  "scripts/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: PLATFORM_DB_ALLOWED,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              importNames: ["platformDb"],
              message:
                "platformDb ne filtre pas par tenant. Utilisez db() ou tenantDb() de @/lib/tenant-db.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
