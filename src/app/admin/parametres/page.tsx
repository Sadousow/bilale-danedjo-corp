import { db } from "@/lib/tenant-db";
import { platformDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { featureGate } from "@/lib/subscription";
import { currentOrigin } from "@/lib/site-url";
import { dnsInstructions } from "@/lib/domains";
import { Card, PageTitle } from "@/components/admin/ui";
import SettingsForm from "./SettingsForm";
import ZonesManager from "./ZonesManager";
import DomainsManager from "./DomainsManager";
import FeatureLocked from "@/components/admin/FeatureLocked";
import PaymentKeysForm from "./PaymentKeysForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const prisma = await db();
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const domainGate = await featureGate("domain");

  const [settings, zones, domains, tenantRow, origin] = await Promise.all([
    getSettings(),
    prisma.deliveryZone.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    platformDb.tenantDomain.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
    platformDb.tenant.findUnique({
      where: { id: tenant.id },
      select: {
        djomyClientId: true,
        djomyClientSecret: true,
        djomyEnabled: true,
      },
    }),
    currentOrigin(),
  ]);

  return (
    <>
      <PageTitle
        title="Paramètres"
        description="Informations légales, facturation, boutique et adresse"
      />

      <SettingsForm values={settings} />

      <Card className="mt-8 p-5 sm:p-6 max-w-3xl">
        <h2 className="font-semibold text-slate-800 mb-1">Zones de livraison</h2>
        <p className="text-sm text-slate-500 mb-5">
          Les clients choisissent leur zone au moment de la commande ; les frais
          correspondants sont ajoutés au total.
        </p>
        <ZonesManager
          zones={zones.map((z) => ({
            id: z.id,
            name: z.name,
            fee: z.fee,
            freeAbove: z.freeAbove,
            delay: z.delay,
            active: z.active,
            position: z.position,
          }))}
        />
      </Card>

      <Card className="mt-8 p-5 sm:p-6 max-w-3xl">
        <h2 className="font-semibold text-slate-800 mb-1">
          Adresse de la boutique
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Utilisez votre propre nom de domaine plutôt que l&apos;adresse par
          défaut.
        </p>

        {/* Même traitement que les sections verrouillées : ce que la fonction
            apporte, son prix, et où cliquer. Le message précédent se
            contentait d'annoncer « offre supérieure », sans dire laquelle ni
            combien — au moment précis où le marchand se pose la question. */}
        {!domainGate.allowed ? (
          <FeatureLocked gate={domainGate} compact />
        ) : (
        <DomainsManager
          shopUrl={origin.replace(/^https?:\/\//, "")}
          domains={domains.map((d) => ({
            id: d.id,
            host: d.host,
            verified: d.verified,
            isPrimary: d.isPrimary,
            dns: dnsInstructions(d.host, d.verificationToken),
          }))}
        />
        )}
      </Card>

      <Card className="mt-8 p-5 sm:p-6 max-w-3xl">
        <h2 className="font-semibold text-slate-800 mb-1">Paiement en ligne</h2>
        <p className="text-sm text-slate-500 mb-5">
          Vos propres clés Djomy — les paiements de vos clients vous reviennent
          directement.
        </p>
        <PaymentKeysForm
          clientId={tenantRow?.djomyClientId ?? ""}
          hasSecret={Boolean(tenantRow?.djomyClientSecret)}
          enabled={tenantRow?.djomyEnabled ?? false}
          webhookUrl={`${origin}/api/paiement/djomy/${tenant.id}`}
        />
      </Card>
    </>
  );
}
