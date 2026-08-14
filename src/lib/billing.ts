import "server-only";

import { platformDb } from "@/lib/db";
import {
  createGatewayPayment,
  isDjomyConfigured,
  platformCredentials,
} from "@/lib/payment/djomy";
import { normalizePhone } from "@/lib/orders";
import { sendSubscriptionNotice } from "@/lib/messaging/subscription-notice";
import type { SubscriptionNotice } from "@/lib/messaging/templates";
import {
  addDays,
  effectiveStatus,
  GRACE_DAYS,
  INVOICE_LEAD_DAYS,
  PERIOD_DAYS,
  renewedPeriodEnd,
  subscriptionInvoiceReference,
  type SubscriptionStatus,
} from "@/lib/plans";

/**
 * Facturation des abonnements — côté plateforme.
 *
 * ⚠️ L'API Djomy telle que documentée ne propose ni mandat ni prélèvement
 * récurrent : on ne peut pas débiter un marchand sans action de sa part. Le
 * renouvellement est donc *assisté* — une facture et un lien de paiement sont
 * créés avant l'échéance, le marchand valide sur son téléphone, et le webhook
 * prolonge la période. Si Djomy ajoute un jour la récurrence, seul
 * `createPaymentLink` sera à revoir.
 */

/**
 * Adresse d'un marchand, depuis son identifiant.
 *
 * On ne passe **pas** par `NEXT_PUBLIC_SITE_URL` : cette variable porte le
 * domaine de la plateforme, et l'utiliser ici renverrait chaque marchand chez
 * nous. C'est exactement le bogue qui existait sur le retour de paiement des
 * commandes, corrigé une première fois — la même erreur s'était glissée dans
 * la facturation des abonnements.
 */
const merchantUrl = (slug: string) => {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = root.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${root}`;
};

// ------------------------------------------------------------- numérotation

async function nextInvoiceNumber(year: number): Promise<number> {
  // `Counter` est rattaché à une boutique ; la plateforme a le sien.
  const counter = await platformDb.platformCounter.upsert({
    where: { key: `ABO-${year}` },
    create: { key: `ABO-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

// ------------------------------------------------------------- facture

export type IssueResult =
  | {
      ok: true;
      /**
       * Faux si la facture existait déjà. L'appelant s'en sert pour ne pas
       * renvoyer un rappel qu'il a déjà envoyé.
       */
      created: boolean;
      invoiceId: string;
      reference: string;
      paymentUrl: string | null;
    }
  | { ok: false; error: string };

/**
 * Émet la facture de la prochaine période pour un abonnement donné.
 * Idempotent : si une facture en attente couvre déjà cette période, elle est
 * renvoyée telle quelle plutôt que dupliquée.
 */
export async function issueInvoiceFor(subscriptionId: string): Promise<IssueResult> {
  const subscription = await platformDb.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, pendingPlan: true, tenant: true },
  });

  if (!subscription) return { ok: false, error: "Abonnement introuvable." };
  if (subscription.status === "RESILIE") {
    return { ok: false, error: "Cet abonnement est résilié." };
  }

  const periodStart = subscription.currentPeriodEnd;
  const periodEnd = addDays(periodStart, PERIOD_DAYS);

  /*
   * La facture couvre la période **suivante** : si le marchand a demandé une
   * baisse d'offre, c'est le nouveau tarif qu'il doit voir, pas l'ancien.
   * Lui facturer le prix fort d'une offre qu'il n'aura plus serait la
   * meilleure façon de perdre sa confiance en une seule ligne.
   */
  const billedPlan = subscription.pendingPlan ?? subscription.plan;

  const existing = await platformDb.subscriptionInvoice.findFirst({
    where: {
      subscriptionId,
      status: "EN_ATTENTE",
      periodStart,
    },
  });

  if (existing) {
    return {
      ok: true,
      created: false,
      invoiceId: existing.id,
      reference: existing.reference,
      paymentUrl: existing.paymentUrl,
    };
  }

  const year = new Date().getFullYear();
  const number = await nextInvoiceNumber(year);
  const reference = subscriptionInvoiceReference(year, number);

  const invoice = await platformDb.subscriptionInvoice.create({
    data: {
      reference,
      year,
      number,
      subscriptionId,
      planName: billedPlan.name,
      amount: billedPlan.priceMonthly,
      periodStart,
      periodEnd,
    },
  });

  const link = await createPaymentLink({
    tenantId: subscription.tenantId,
    slug: subscription.tenant.slug,
    reference,
    amount: billedPlan.priceMonthly,
    tenantName: subscription.tenant.name,
    planName: billedPlan.name,
    payerNumber: subscription.billingPhone,
  });

  if (link.ok) {
    await platformDb.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { paymentUrl: link.url },
    });
  }

  return {
    ok: true,
    created: true,
    invoiceId: invoice.id,
    reference,
    paymentUrl: link.ok ? link.url : null,
  };
}

export type PaymentLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Numéro qui recevra la demande de paiement.
 *
 * On préfère celui que le marchand a donné pour son abonnement, et on se
 * rabat sur ceux de la boutique — utile pour les abonnements créés avant que
 * `billingPhone` existe.
 */
async function payerNumberFor(
  tenantId: string,
  billingPhone: string | null
): Promise<string | null> {
  const fromSubscription = normalizePhone(billingPhone ?? "");
  if (fromSubscription) return fromSubscription;

  const settings = await platformDb.settings.findUnique({
    where: { tenantId },
    select: { companyPhone: true, whatsappNumber: true },
  });

  return normalizePhone(settings?.whatsappNumber || settings?.companyPhone || "");
}

/** Crée le lien de paiement Djomy, ou dit pourquoi il n'a pas pu l'être. */
async function createPaymentLink(input: {
  tenantId: string;
  slug: string;
  reference: string;
  amount: number;
  tenantName: string;
  planName: string;
  payerNumber: string | null;
}): Promise<PaymentLinkResult> {
  const credentials = platformCredentials();
  if (!isDjomyConfigured(credentials)) {
    return {
      ok: false,
      error: "Le paiement en ligne n'est pas configuré. Contactez-nous.",
    };
  }

  const payerNumber = await payerNumberFor(input.tenantId, input.payerNumber);

  if (!payerNumber) {
    return {
      ok: false,
      error:
        "Indiquez le numéro Mobile Money qui recevra la demande de paiement.",
    };
  }

  /*
   * Le payeur est le **marchand**, pas nous : il doit revenir sur sa propre
   * page Abonnement. Les deux adresses pointaient sur la console plateforme,
   * où il n'a aucun compte — il aurait donc payé puis atterri sur un écran de
   * connexion qui ne le concerne pas.
   */
  const back = `${merchantUrl(input.slug)}/admin/abonnement`;

  const result = await createGatewayPayment({
    credentials,
    amount: input.amount,
    payerNumber,
    description: `Abonnement ${input.planName} — ${input.tenantName}`,
    merchantReference: input.reference,
    returnUrl: `${back}?paiement=recu`,
    cancelUrl: `${back}?paiement=annule`,
    metadata: { invoiceReference: input.reference },
  });

  if (result.ok && result.redirectUrl) return { ok: true, url: result.redirectUrl };

  /*
   * L'erreur de la passerelle est technique — « authentification refusée
   * (403) », « réponse illisible ». Elle est précieuse dans le journal et
   * n'apprend rien au marchand, qui n'y peut rien : on lui dit quoi faire,
   * on garde le détail pour nous.
   */
  console.error(
    `[abonnement] lien de paiement ${input.reference} :`,
    result.ok ? "aucune URL renvoyée" : result.error
  );

  return {
    ok: false,
    error:
      "Le paiement en ligne est momentanément indisponible. Réessayez dans quelques minutes, ou contactez-nous pour régler autrement.",
  };
}

/**
 * Crée — ou recrée — le lien de paiement d'une facture en attente.
 *
 * Sans cette reprise, un marchand dont le lien a manqué à l'émission n'avait
 * plus aucun moyen de payer : l'écran lui disait « contactez-nous », et
 * l'unique page où renseigner son numéro lui était fermée puisque sa boutique
 * l'était. Le voilà capable de se débloquer seul, depuis la page qui reste
 * ouverte exprès pour ça.
 *
 * `payerNumber` est retenu sur l'abonnement : la facture suivante partira avec
 * son lien sans qu'on redemande quoi que ce soit.
 */
export async function ensureInvoicePaymentLink(
  invoiceId: string,
  payerNumber?: string | null
): Promise<PaymentLinkResult> {
  const invoice = await platformDb.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: { include: { tenant: true } } },
  });

  if (!invoice) return { ok: false, error: "Facture introuvable." };
  if (invoice.status !== "EN_ATTENTE") {
    return { ok: false, error: "Cette facture n'est plus en attente." };
  }

  // Un numéro donné à la main l'emporte : c'est justement ce qu'on fait quand
  // le lien précédent est parti sur le mauvais téléphone.
  const given = normalizePhone(payerNumber ?? "");

  if (payerNumber && !given) {
    return { ok: false, error: "Ce numéro ne semble pas valide." };
  }

  if (!given && invoice.paymentUrl) return { ok: true, url: invoice.paymentUrl };

  if (given && given !== invoice.subscription.billingPhone) {
    await platformDb.subscription.update({
      where: { id: invoice.subscriptionId },
      data: { billingPhone: given },
    });
  }

  const link = await createPaymentLink({
    tenantId: invoice.subscription.tenantId,
    slug: invoice.subscription.tenant.slug,
    reference: invoice.reference,
    amount: invoice.amount,
    tenantName: invoice.subscription.tenant.name,
    planName: invoice.planName,
    payerNumber: given ?? invoice.subscription.billingPhone,
  });

  if (link.ok) {
    await platformDb.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { paymentUrl: link.url },
    });
  }

  return link;
}

/**
 * Réaligne la facture en attente sur l'offre qui sera réellement servie.
 *
 * Le cas courant : la facture part trois jours avant l'échéance, **puis** le
 * marchand descend d'offre. Sans ce réalignement il réglait le tarif fort pour
 * une période qu'il passerait au tarif faible — et le règlement appliquait
 * quand même la baisse. La facture doit dire ce qui sera servi.
 *
 * Le lien Djomy porte l'ancien montant : on le jette, il sera recréé au bon
 * tarif. Encaisser 350 000 pour une période facturée 150 000 serait pire que
 * le défaut qu'on corrige.
 */
export async function repriceUpcomingInvoice(
  subscriptionId: string
): Promise<void> {
  const subscription = await platformDb.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, pendingPlan: true },
  });

  if (!subscription) return;

  const billedPlan = subscription.pendingPlan ?? subscription.plan;

  const invoice = await platformDb.subscriptionInvoice.findFirst({
    where: {
      subscriptionId,
      status: "EN_ATTENTE",
      periodStart: subscription.currentPeriodEnd,
    },
  });

  if (!invoice) return;
  if (
    invoice.planName === billedPlan.name &&
    invoice.amount === billedPlan.priceMonthly
  ) {
    return;
  }

  await platformDb.subscriptionInvoice.update({
    where: { id: invoice.id },
    data: {
      planName: billedPlan.name,
      amount: billedPlan.priceMonthly,
      paymentUrl: null,
    },
  });
}

// ------------------------------------------------------------- règlement

/**
 * Enregistre le paiement d'une facture et prolonge la période.
 * Appelée par le webhook Djomy ou par un agent depuis la console.
 */
export async function settleInvoice(
  invoiceId: string,
  options: { manual?: boolean; paymentReference?: string | null } = {}
): Promise<boolean> {
  const invoice = await platformDb.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: true },
  });

  if (!invoice || invoice.status === "PAYEE") return false;

  /*
   * Le règlement fait basculer la période — c'est donc ici, et nulle part
   * ailleurs, qu'une baisse d'offre demandée par le marchand prend effet. La
   * facture qu'il vient de payer était déjà au nouveau tarif.
   *
   * On ne l'applique que si la facture ouvre bien la période suivante : une
   * vieille facture réglée en retard ne doit pas déclencher un changement
   * d'offre par surprise.
   */
  const renews =
    invoice.subscription.pendingPlanId !== null &&
    invoice.periodStart.getTime() ===
      invoice.subscription.currentPeriodEnd.getTime();

  const now = new Date();

  await platformDb.$transaction([
    platformDb.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAYEE",
        paidAt: now,
        paidManually: options.manual ?? false,
        paymentReference: options.paymentReference ?? invoice.paymentReference,
      },
    }),
    platformDb.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        status: "ACTIF",
        /*
         * Une facture réglée en retard couvre une période déjà écoulée : la
         * reprendre telle quelle laissait le marchand échu à la seconde où il
         * venait de payer. Ses trente jours partent alors du règlement.
         */
        currentPeriodEnd: renewedPeriodEnd(invoice.periodEnd, now),
        graceEndsAt: null,
        ...(renews
          ? {
              planId: invoice.subscription.pendingPlanId!,
              pendingPlanId: null,
            }
          : {}),
      },
    }),
  ]);

  return true;
}

// ------------------------------------------------------------- tâche planifiée

export type BillingRunReport = {
  issued: number;
  markedUnpaid: number;
  suspended: number;
  errors: string[];
};

/**
 * Passe quotidien : émet les factures à venir et met à jour les statuts.
 *
 * Le statut affiché est de toute façon recalculé à la lecture ; ce passage ne
 * fait que le persister, pour que la console et les requêtes soient justes.
 */
export async function runBillingCycle(
  now: Date = new Date()
): Promise<BillingRunReport> {
  const report: BillingRunReport = {
    issued: 0,
    markedUnpaid: 0,
    suspended: 0,
    errors: [],
  };

  const subscriptions = await platformDb.subscription.findMany({
    where: { status: { notIn: ["RESILIE"] } },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
      graceEndsAt: true,
      tenantId: true,
    },
  });

  for (const subscription of subscriptions) {
    try {
      // 1. Facture à émettre ?
      const leadDate = addDays(now, INVOICE_LEAD_DAYS);
      if (subscription.currentPeriodEnd <= leadDate) {
        const result = await issueInvoiceFor(subscription.id);
        /*
         * `created` et pas `ok` : `issueInvoiceFor` renvoie aussi la facture
         * qu'il a trouvée. En se contentant de `ok`, la passe renvoyait le
         * même rappel tous les jours tant que la facture n'était pas payée —
         * exactement ce qu'un marchand en difficulté n'a pas besoin de lire
         * chaque matin.
         */
        if (result.ok && result.created) {
          report.issued += 1;
          await notifyDue(subscription.id, "echeance", subscription.currentPeriodEnd);
        }
      }

      // 2. Statut à rafraîchir
      const target = effectiveStatus(
        {
          status: subscription.status as SubscriptionStatus,
          currentPeriodEnd: subscription.currentPeriodEnd,
          graceEndsAt: subscription.graceEndsAt,
        },
        now
      );

      if (target !== subscription.status) {
        await platformDb.subscription.update({
          where: { id: subscription.id },
          data: {
            status: target,
            graceEndsAt:
              target === "IMPAYE" && !subscription.graceEndsAt
                ? addDays(subscription.currentPeriodEnd, GRACE_DAYS)
                : subscription.graceEndsAt,
          },
        });

        if (target === "IMPAYE") report.markedUnpaid += 1;
        if (target === "SUSPENDU") report.suspended += 1;

        // Ces rappels ne partent qu'au changement d'état, donc une seule
        // fois — la condition englobante l'assure.
        if (target === "IMPAYE" || target === "SUSPENDU") {
          await notifyDue(
            subscription.id,
            target === "IMPAYE" ? "impaye" : "suspension",
            subscription.currentPeriodEnd
          );
        }

        /*
         * `Tenant.status` n'est **pas** touché ici, volontairement.
         *
         * Ce champ dit une seule chose : « la plateforme a fermé cette
         * boutique à la main ». Le non-paiement se lit déjà entièrement dans
         * `Subscription.status`, recalculé à chaque lecture.
         *
         * Quand la passe y écrivait aussi, les deux fermetures devenaient
         * indistinguables : un marchand fermé pour impayé se retrouvait avec
         * le back-office verrouillé, donc sans aucun moyen de payer. Et
         * régler la facture ne rouvrait rien, puisque personne ne remettait
         * ce champ à `ACTIF`. Une seule signification par champ.
         */
      }
    } catch (error) {
      report.errors.push(
        `${subscription.id} : ${error instanceof Error ? error.message : "erreur"}`
      );
    }
  }

  return report;
}

/**
 * Prévient l'administrateur de la boutique.
 * Isolé dans sa propre fonction, et silencieux en cas d'échec : un problème
 * d'envoi ne doit jamais interrompre la passe de facturation, qui a des
 * choses plus importantes à finir.
 */
async function notifyDue(
  subscriptionId: string,
  notice: SubscriptionNotice,
  dueDate: Date
): Promise<void> {
  try {
    const subscription = await platformDb.subscription.findUnique({
      where: { id: subscriptionId },
      select: { tenantId: true, plan: { select: { priceMonthly: true } } },
    });

    if (!subscription) return;

    await sendSubscriptionNotice({
      tenantId: subscription.tenantId,
      notice,
      amount: subscription.plan?.priceMonthly ?? 0,
      dueDate,
      graceDays: GRACE_DAYS,
    });
  } catch (error) {
    console.error("[facturation] rappel non envoyé :", error);
  }
}
