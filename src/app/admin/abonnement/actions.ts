"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { platformDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import {
  getTenantSubscription,
  productQuota,
  userQuota,
} from "@/lib/subscription";
import { ensureInvoicePaymentLink, repriceUpcomingInvoice } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { isShopClosed, pendingPlanEffectiveOn } from "@/lib/plans";

export type PlanChangeState = { ok?: string; error?: string };

/**
 * Changement d'offre à l'initiative du marchand.
 *
 * Deux sens, deux traitements, pour une raison simple : **on ne retire pas ce
 * qui est déjà payé.**
 *
 *   - Monter d'offre prend effet immédiatement. Le marchand veut la fonction
 *     maintenant, la lui faire attendre trois semaines serait absurde ; la
 *     différence se règle à la prochaine facture.
 *   - Descendre d'offre prend effet à l'échéance. Il a payé la période en
 *     cours au tarif supérieur, il la termine au tarif supérieur.
 *
 * Une baisse est refusée si la boutique dépasse déjà les limites de l'offre
 * visée. Ni supprimer ses produits ni le laisser dans un état illégal ne sont
 * acceptables — on lui dit ce qu'il doit ranger avant.
 */
export async function changeMyPlanAction(
  _prev: PlanChangeState,
  formData: FormData
): Promise<PlanChangeState> {
  await requireRole("ADMIN");

  const planId = String(formData.get("planId") ?? "");
  const subscription = await getTenantSubscription();

  if (!subscription.id) {
    return {
      error:
        "Aucun abonnement n'est rattaché à cette boutique. Contactez-nous.",
    };
  }

  if (subscription.status === "RESILIE") {
    return { error: "Cet abonnement est résilié. Contactez-nous." };
  }

  const target = await platformDb.plan.findFirst({
    where: { id: planId, active: true },
  });

  if (!target) return { error: "Cette offre n'existe pas." };
  if (target.id === subscription.plan.id) {
    return { error: "C'est déjà votre offre." };
  }

  const isUpgrade = target.priceMonthly > subscription.plan.priceMonthly;

  /*
   * Monter d'offre alors que la précédente n'est pas réglée reviendrait à
   * offrir davantage à quelqu'un qui n'a pas payé le moins. Descendre reste
   * possible : c'est souvent précisément ce que veut un marchand qui n'y
   * arrive plus, et le lui refuser le pousserait vers la sortie.
   */
  if (isUpgrade && isShopClosed(subscription.status)) {
    return {
      error:
        "Réglez d'abord la facture en attente. Vous pourrez monter d'offre juste après.",
    };
  }

  if (isUpgrade) {
    await platformDb.subscription.update({
      where: { id: subscription.id },
      // Une montée annule une baisse en attente : le marchand vient de dire
      // le contraire de ce qu'il avait demandé, c'est le dernier mot qui vaut.
      data: { planId: target.id, pendingPlanId: null },
    });

    // La facture de la période suivante doit porter l'offre qui sera servie.
    await repriceUpcomingInvoice(subscription.id);

    revalidatePath("/admin", "layout");

    return {
      ok: `Vous êtes passé à l'offre ${target.name}. Elle est active dès maintenant ; la différence sera reportée sur votre prochaine facture.`,
    };
  }

  // ---------------------------------------------------------- baisse d'offre

  const [products, users] = await Promise.all([productQuota(), userQuota()]);
  const over: string[] = [];

  if (target.maxProducts > 0 && products.used > target.maxProducts) {
    over.push(
      `${products.used} produits actifs pour ${target.maxProducts} autorisés`
    );
  }
  if (target.maxUsers > 0 && users.used > target.maxUsers) {
    over.push(`${users.used} comptes actifs pour ${target.maxUsers} autorisés`);
  }

  if (over.length > 0) {
    return {
      error: `Impossible de passer à l'offre ${target.name} : ${over.join(" et ")}. Désactivez ce qui dépasse, puis réessayez — rien ne sera supprimé.`,
    };
  }

  await platformDb.subscription.update({
    where: { id: subscription.id },
    data: { pendingPlanId: target.id },
  });

  /*
   * La facture de la période suivante est peut-être déjà partie, à l'ancien
   * tarif — elle sort trois jours avant l'échéance, souvent avant que le
   * marchand se décide. La régler appliquerait la baisse tout en encaissant
   * le prix fort.
   */
  await repriceUpcomingInvoice(subscription.id);

  revalidatePath("/admin/abonnement");

  const on = pendingPlanEffectiveOn(subscription.currentPeriodEnd);

  return {
    ok: `Votre offre passera à ${target.name} ${
      on ? `le ${formatDate(on)}` : "dès le règlement de votre facture"
    }. D'ici là vous gardez l'offre ${subscription.plan.name}, que vous avez déjà réglée.`,
  };
}

/** Annule une baisse d'offre programmée. */
export async function cancelPendingPlanAction(): Promise<void> {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const subscription = await platformDb.subscription.findUnique({
    where: { tenantId: tenant.id },
    select: { id: true },
  });

  if (!subscription) return;

  await platformDb.subscription.update({
    where: { id: subscription.id },
    data: { pendingPlanId: null },
  });

  // La facture repasse au tarif de l'offre conservée.
  await repriceUpcomingInvoice(subscription.id);

  revalidatePath("/admin/abonnement");
}

export type PaymentLinkState = { error?: string };

/**
 * Crée le lien de paiement d'une facture en attente, puis y envoie le
 * marchand.
 *
 * Le numéro n'est demandé que s'il manque — c'est-à-dire dans le seul cas où
 * la facture s'affichait jusqu'ici sans aucun bouton, avec un « contactez-nous »
 * pour toute issue.
 */
export async function createPaymentLinkAction(
  _prev: PaymentLinkState,
  formData: FormData
): Promise<PaymentLinkState> {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const phone = String(formData.get("telephone") ?? "").trim();

  const invoice = await platformDb.subscriptionInvoice.findFirst({
    where: { subscription: { tenantId: tenant.id }, status: "EN_ATTENTE" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!invoice) return { error: "Aucune facture en attente." };

  const link = await ensureInvoicePaymentLink(invoice.id, phone || null);

  if (!link.ok) return { error: link.error };

  revalidatePath("/admin/abonnement");
  redirect(link.url);
}
