import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { platformDb } from "@/lib/db";
import { settleInvoice } from "@/lib/billing";
import {
  isDjomyConfigured,
  parseWebhook,
  platformCredentials,
  verifyWebhookSignature,
} from "@/lib/payment/djomy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook Djomy des abonnements — encaissements de la plateforme.
 *
 * À déclarer dans l'espace marchand de la plateforme :
 *   https://tondomaine.com/api/abonnement/djomy
 *
 * À ne pas confondre avec `/api/paiement/djomy/<tenantId>`, qui encaisse les
 * commandes des clients d'un marchand avec les clés de ce marchand.
 */
export async function POST(request: NextRequest) {
  const credentials = platformCredentials();
  if (!isDjomyConfigured(credentials)) {
    return NextResponse.json(
      { received: false, error: "Encaissement plateforme non configuré." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifyWebhookSignature(credentials, rawBody, signature)) {
    return NextResponse.json(
      { received: false, error: "Signature invalide." },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { received: false, error: "Corps illisible." },
      { status: 400 }
    );
  }

  const event = parseWebhook(payload);

  const invoice = event.merchantReference
    ? await platformDb.subscriptionInvoice.findUnique({
        where: { reference: event.merchantReference },
      })
    : event.transactionId
      ? await platformDb.subscriptionInvoice.findFirst({
          where: { paymentReference: event.transactionId },
        })
      : null;

  if (!invoice) {
    // 200 volontaire : inutile que Djomy réessaie une référence inconnue.
    return NextResponse.json({ received: true, matched: false });
  }

  const status = (event.status ?? "").toUpperCase();
  const success = event.eventType === "payment.success" || status === "SUCCESS";
  const failed =
    event.eventType === "payment.failed" ||
    event.eventType === "payment.cancelled" ||
    status === "FAILED" ||
    status === "CANCELLED";

  if (success) {
    // `settled` dit ce qui s'est passé, pas ce qu'on espérait : un webhook
    // rejoué sur une facture déjà réglée ne règle rien.
    const settled = await settleInvoice(invoice.id, {
      paymentReference: event.transactionId,
    });
    return NextResponse.json({ received: true, settled });
  }

  if (failed && invoice.status === "EN_ATTENTE") {
    await platformDb.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "ECHOUEE",
        paymentReference: event.transactionId ?? invoice.paymentReference,
      },
    });
  }

  return NextResponse.json({ received: true });
}
