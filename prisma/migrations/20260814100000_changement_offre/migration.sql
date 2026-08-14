-- Changement d'offre en libre-service, et séparation des deux fermetures.
--
-- 1. `Subscription.pendingPlanId` : la baisse d'offre demandée par le
--    marchand, appliquée à la prochaine échéance. Une montée prend effet
--    immédiatement et ne passe pas par ce champ — le marchand a payé la
--    période en cours, on ne lui retire rien de ce qu'il a réglé.

ALTER TABLE "Subscription" ADD COLUMN "pendingPlanId" TEXT;

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_pendingPlanId_fkey"
  FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Subscription_pendingPlanId_idx" ON "Subscription"("pendingPlanId");

-- 2. Rattrapage : `Tenant.status` ne dit plus que « la plateforme a fermé
--    cette boutique à la main ». La passe de facturation y écrivait aussi
--    SUSPENDU en cas d'impayé, et personne ne le remettait à ACTIF après
--    paiement — ces boutiques resteraient fermées pour toujours.
--
--    On rouvre celles dont la fermeture vient manifestement du non-paiement,
--    c'est-à-dire dont l'abonnement est lui-même en impayé ou suspendu. Une
--    boutique fermée à la main a normalement un abonnement sain, et garde
--    donc son statut. Le cas ambigu — fermée à la main *et* en impayé — est
--    rouvert par prudence : une boutique rouverte à tort se referme d'un
--    clic depuis la console, l'inverse coûte un appel du marchand.

UPDATE "Tenant" t
SET "status" = 'ACTIF'
WHERE t."status" = 'SUSPENDU'
  AND EXISTS (
    SELECT 1 FROM "Subscription" s
    WHERE s."tenantId" = t."id"
      AND s."status" IN ('IMPAYE', 'SUSPENDU')
  );
