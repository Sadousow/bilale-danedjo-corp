"use server";

import { revalidatePath } from "next/cache";

import { platformDb } from "@/lib/db";
import { audit, requirePlatformUser } from "@/lib/platform-auth";
import {
  issueInvoiceFor,
  repriceUpcomingInvoice,
  runBillingCycle,
  settleInvoice,
} from "@/lib/billing";

export type BillingState = { ok?: string; error?: string };

/**
 * Change l'offre d'une boutique. Prend effet à la prochaine échéance.
 *
 * **Une baisse d'offre ne supprime rien.** Si la boutique dépasse les
 * nouvelles limites, elle garde ses produits et ses comptes : effacer le
 * travail d'un marchand parce qu'il descend d'offre serait inacceptable. Les
 * quotas l'empêcheront simplement d'en ajouter tant qu'il n'est pas repassé
 * sous la limite.
 *
 * Le dépassement est journalisé pour qu'il ne passe pas inaperçu : sans
 * cette trace, un marchand descendu d'offre pourrait conserver indéfiniment
 * un catalogue qu'il ne paie plus.
 */
export async function changePlanAction(formData: FormData) {
  const actor = await requirePlatformUser();

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!subscriptionId || !planId) return;

  const [plan, subscription] = await Promise.all([
    platformDb.plan.findUnique({ where: { id: planId } }),
    platformDb.subscription.findUnique({
      where: { id: subscriptionId },
      select: { tenantId: true, tenant: { select: { name: true } } },
    }),
  ]);
  if (!plan || !subscription) return;

  const [products, users] = await Promise.all([
    platformDb.product.count({
      where: { tenantId: subscription.tenantId, active: true },
    }),
    platformDb.user.count({
      where: { tenantId: subscription.tenantId, active: true },
    }),
  ]);

  const over: string[] = [];
  if (plan.maxProducts > 0 && products > plan.maxProducts) {
    over.push(`${products} produits pour ${plan.maxProducts} autorisés`);
  }
  if (plan.maxUsers > 0 && users > plan.maxUsers) {
    over.push(`${users} utilisateurs pour ${plan.maxUsers} autorisés`);
  }

  await platformDb.subscription.update({
    where: { id: subscriptionId },
    // La décision de la plateforme efface une baisse d'offre que le marchand
    // avait programmée : sans ça, son ancien choix s'appliquerait tout seul à
    // la prochaine échéance et écraserait celui qu'on vient de prendre.
    data: { planId, pendingPlanId: null },
  });

  // La facture en attente porterait encore l'offre précédente : le marchand
  // paierait un tarif pour un autre service.
  await repriceUpcomingInvoice(subscriptionId);

  await audit({
    action: "OFFRE_CHANGEE",
    actor,
    tenantId: subscription.tenantId,
    tenantName: subscription.tenant.name,
    details: over.length
      ? `Offre changée pour « ${plan.name} » — dépassement : ${over.join(", ")}`
      : `Offre changée pour « ${plan.name} »`,
  });

  revalidatePath("/superadmin/abonnements");
  // La fiche du marchand affiche les mêmes données.
  revalidatePath("/superadmin/boutiques/[id]", "page");
}

/** Marque une facture réglée à la main — virement, espèces, Mobile Money. */
export async function markInvoicePaidAction(formData: FormData) {
  await requirePlatformUser();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  await settleInvoice(invoiceId, { manual: true });
  revalidatePath("/superadmin/abonnements");
  // La fiche du marchand affiche les mêmes données.
  revalidatePath("/superadmin/boutiques/[id]", "page");
}

/** Émet immédiatement la facture de la prochaine période. */
export async function issueInvoiceAction(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  await requirePlatformUser();

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const result = await issueInvoiceFor(subscriptionId);

  revalidatePath("/superadmin/abonnements");
  // La fiche du marchand affiche les mêmes données.
  revalidatePath("/superadmin/boutiques/[id]", "page");

  if (!result.ok) return { error: result.error };

  if (!result.created) {
    return { ok: `Facture ${result.reference} déjà émise pour cette période.` };
  }

  return {
    ok: result.paymentUrl
      ? `Facture ${result.reference} émise, lien de paiement créé.`
      : `Facture ${result.reference} émise. Aucun lien de paiement : vérifiez les clés Djomy de la plateforme et le téléphone du marchand. Le marchand peut aussi le créer lui-même depuis sa page Abonnement.`,
  };
}

/** Déclenche le passage de facturation à la demande. */
export async function runCycleAction(
  _prev: BillingState,
  _formData: FormData
): Promise<BillingState> {
  await requirePlatformUser();

  const report = await runBillingCycle();
  revalidatePath("/superadmin/abonnements");
  // La fiche du marchand affiche les mêmes données.
  revalidatePath("/superadmin/boutiques/[id]", "page");

  const parts = [
    `${report.issued} facture(s) émise(s)`,
    `${report.markedUnpaid} passée(s) en impayé`,
    `${report.suspended} suspendue(s)`,
  ];

  return report.errors.length
    ? { error: `${parts.join(", ")}. Erreurs : ${report.errors.join(" ; ")}` }
    : { ok: `${parts.join(", ")}.` };
}
