"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { nextCounter } from "@/lib/counters";
import { getSettings } from "@/lib/settings";
import { getTenantSubscription } from "@/lib/subscription";
import { hasFeature, isShopClosed } from "@/lib/plans";
import { deliveryFeeFor, normalizePhone, orderReference } from "@/lib/orders";
import { findOrCreateCustomer, getShopSession } from "@/lib/shop-auth";
import { createGatewayPayment } from "@/lib/payment/djomy";
import { currentTenantCredentials } from "@/lib/payment/tenant-djomy";
import { isDjomyConfigured } from "@/lib/payment/djomy";
import { notifyNewOrder } from "@/lib/messaging/notify";
import { currentOrigin } from "@/lib/site-url";

export type CheckoutLine = { sku: string; quantity: number };

export type CheckoutInput = {
  lines: CheckoutLine[];
  name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
  zoneId: string;
  paymentMethod: "A_LA_LIVRAISON" | "EN_LIGNE";
};

export type CheckoutResult =
  | { ok: true; id: string; reference: string; redirectUrl?: string }
  | { ok: false; error: string };

/*
 * L'adresse de retour de paiement doit être celle de LA BOUTIQUE.
 *
 * Cette fonction faisait passer `NEXT_PUBLIC_SITE_URL` avant l'hôte réel.
 * Cette variable est unique pour toute la plateforme : dès qu'elle est
 * renseignée — et le fichier d'exemple invite à le faire — un client de
 * `bilale.guygou.com` qui payait était renvoyé sur `guygou.com/commande/<id>`,
 * une adresse qui n'existe pas dans la zone plateforme. Il perdait la
 * confirmation de la commande qu'il venait de régler.
 *
 * `currentOrigin()` lit l'hôte de la requête, donc la bonne boutique, y
 * compris sur un domaine personnalisé.
 */
const siteUrl = currentOrigin;

export async function placeOrderAction(
  input: CheckoutInput
): Promise<CheckoutResult> {
  const prisma = await db();
  const settings = await getSettings();
  if (!settings.shopEnabled) {
    return { ok: false, error: "La commande en ligne est momentanément fermée." };
  }

  // L'abonnement fait autorité, quels que soient les réglages du marchand.
  const subscription = await getTenantSubscription();
  if (isShopClosed(subscription.status) || !hasFeature(subscription.plan, "shop")) {
    return {
      ok: false,
      error: "La commande en ligne n'est pas disponible pour le moment.",
    };
  }

  // --- Coordonnées
  const name = (input.name ?? "").trim();
  const address = (input.address ?? "").trim();
  const phone = normalizePhone(input.phone ?? "");
  const email = (input.email ?? "").trim().toLowerCase() || null;

  if (!name) return { ok: false, error: "Votre nom est obligatoire." };
  if (!phone)
    return {
      ok: false,
      error: "Numéro de téléphone invalide. Exemple : 624 39 03 32.",
    };
  if (!address)
    return { ok: false, error: "L'adresse de livraison est obligatoire." };
  if (email && !email.includes("@"))
    return { ok: false, error: "Adresse email invalide." };

  // --- Panier : les prix viennent de la base, jamais du navigateur
  const requested = (input.lines ?? []).filter(
    (l) => l.sku && Number.isFinite(l.quantity) && l.quantity > 0
  );
  if (requested.length === 0) return { ok: false, error: "Votre panier est vide." };

  const products = await prisma.product.findMany({
    where: { sku: { in: requested.map((l) => l.sku) }, active: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));

  for (const line of requested) {
    const product = bySku.get(line.sku);
    if (!product) {
      return {
        ok: false,
        error: "Un article de votre panier n'est plus disponible. Rechargez la page.",
      };
    }
    if (product.stock < line.quantity) {
      return {
        ok: false,
        error:
          product.stock === 0
            ? `« ${product.name} » est en rupture de stock.`
            : `Il ne reste que ${product.stock} unité(s) de « ${product.name} ».`,
      };
    }
  }

  const items = requested.map((line, index) => {
    const product = bySku.get(line.sku)!;
    const quantity = Math.round(line.quantity);
    return {
      productId: product.id,
      position: index,
      name: product.name,
      unit: product.unit,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
    };
  });

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);

  if (settings.minOrderAmount > 0 && subtotal < settings.minOrderAmount) {
    return {
      ok: false,
      error: `Le montant minimum de commande est de ${settings.minOrderAmount.toLocaleString("fr-FR")} GNF.`,
    };
  }

  // --- Livraison
  const zone = await prisma.deliveryZone.findFirst({
    where: { id: input.zoneId, active: true },
  });
  if (!zone) return { ok: false, error: "Choisissez une zone de livraison." };

  const deliveryFee = deliveryFeeFor(zone, subtotal);
  const total = subtotal + deliveryFee;

  // --- Paiement
  const online = input.paymentMethod === "EN_LIGNE";
  const credentials = await currentTenantCredentials();
  if (online && (!settings.onlinePaymentEnabled || !isDjomyConfigured(credentials))) {
    return {
      ok: false,
      error: "Le paiement en ligne est indisponible. Choisissez le paiement à la livraison.",
    };
  }

  // --- Client
  const session = await getShopSession();
  const customer = session
    ? await prisma.customer.update({
        where: { id: session.sub },
        data: { address: address || undefined },
      })
    : await findOrCreateCustomer({ name, phone, email, address });

  // --- Enregistrement
  const now = new Date();
  const year = now.getFullYear();

  const tenantId = await currentTenantId();

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextCounter(tx, tenantId, `ORDER-${year}`);

    return tx.order.create({
      data: {
        year,
        number,
        reference: orderReference(year, number),
        paymentMethod: online ? "EN_LIGNE" : "A_LA_LIVRAISON",
        paymentProvider: online ? "djomy" : null,
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        clientAddress: address,
        clientNotes: (input.notes ?? "").trim(),
        customerId: customer.id,
        zoneId: zone.id,
        zoneName: zone.name,
        subtotal,
        deliveryFee,
        total,
        items: { create: items },
      },
    });
  });

  revalidatePath("/admin/commandes");

  // Accusé de réception au client, alerte au marchand. En arrière-plan et
  // sans jamais lever : une notification perdue ne doit pas coûter la
  // commande.
  await notifyNewOrder(order.id);

  if (!online) return { ok: true, id: order.id, reference: order.reference };

  // --- Redirection vers le portail Djomy
  const base = await siteUrl();
  const payment = await createGatewayPayment({
    credentials,
    amount: total,
    payerNumber: phone,
    description: `Commande ${order.reference} — ${settings.companyName}`,
    merchantReference: order.reference,
    returnUrl: `${base}/commande/${order.id}`,
    cancelUrl: `${base}/commande/${order.id}?annule=1`,
    metadata: { orderReference: order.reference },
  });

  if (!payment.ok) {
    // La commande existe : le client pourra régler à la livraison.
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: "A_LA_LIVRAISON", paymentProvider: null },
    });
    return {
      ok: false,
      error: `${payment.error} Votre commande ${order.reference} a été enregistrée en paiement à la livraison.`,
    };
  }

  if (payment.transactionId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: payment.transactionId },
    });
  }

  return {
    ok: true,
    id: order.id,
    reference: order.reference,
    redirectUrl: payment.redirectUrl,
  };
}
