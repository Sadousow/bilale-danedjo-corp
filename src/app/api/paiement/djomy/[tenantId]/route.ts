import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { tenantDb } from "@/lib/tenant-db";
import { credentialsForTenant } from "@/lib/payment/tenant-djomy";
import {
  isDjomyConfigured,
  parseWebhook,
  verifyWebhookSignature,
} from "@/lib/payment/djomy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook Djomy — notifications de changement de statut de paiement.
 *
 * L'URL porte l'identifiant du marchand, car la signature se vérifie avec
 * *sa* clé secrète : il faut savoir de quelle boutique vient l'appel avant
 * de pouvoir authentifier la requête.
 *
 * À déclarer dans l'espace marchand Djomy :
 *   https://<boutique>/api/paiement/djomy/<tenantId>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const credentials = await credentialsForTenant(tenantId);
  if (!isDjomyConfigured(credentials)) {
    return NextResponse.json(
      { received: false, error: "Paiement en ligne non configuré." },
      { status: 503 }
    );
  }

  // Le corps doit être lu brut : la signature porte sur les octets envoyés.
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
  const prisma = tenantDb(tenantId);

  // On retrouve la commande par notre référence, sinon par l'id de transaction.
  const order = event.merchantReference
    ? await prisma.order.findFirst({
        where: { reference: event.merchantReference },
      })
    : event.transactionId
      ? await prisma.order.findFirst({
          where: { paymentReference: event.transactionId },
        })
      : null;

  if (!order) {
    // On répond 200 : inutile que Djomy réessaie indéfiniment.
    return NextResponse.json({ received: true, matched: false });
  }

  const status = (event.status ?? "").toUpperCase();
  const success = event.eventType === "payment.success" || status === "SUCCESS";
  const failed =
    event.eventType === "payment.failed" ||
    event.eventType === "payment.cancelled" ||
    status === "FAILED" ||
    status === "CANCELLED";

  if (!success && !failed) {
    return NextResponse.json({ received: true, ignored: event.eventType });
  }

  // Idempotence : une commande déjà payée ne redescend pas en échec.
  if (order.paymentStatus === "PAYEE" && !success) {
    return NextResponse.json({ received: true, alreadyPaid: true });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: success ? "PAYEE" : "ECHOUEE",
      paidAmount: success ? (event.paidAmount ?? order.total) : 0,
      paidAt: success ? new Date() : null,
      paymentReference: event.transactionId ?? order.paymentReference,
    },
  });

  return NextResponse.json({ received: true });
}
