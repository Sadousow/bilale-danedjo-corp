import "server-only";

import { db } from "@/lib/tenant-db";
import { requireTenant } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { currentOrigin } from "@/lib/site-url";
import { sendMessageInBackground } from "./send";
import {
  orderConfirmation,
  orderAlert,
  mailColors,
  type OrderLine,
} from "./templates";
import { isEmail } from "./channel";

/**
 * Notifications liées aux commandes.
 *
 * Rien de ce qui suit ne doit pouvoir faire échouer une commande. Tous les
 * envois partent en arrière-plan et toutes les erreurs sont avalées : une
 * commande enregistrée dont l'accusé de réception n'est pas parti reste une
 * commande enregistrée, et c'est ce qui compte pour le marchand comme pour
 * le client.
 */

export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    const [tenant, settings, prisma, base] = await Promise.all([
      requireTenant(),
      getSettings(),
      db(),
      currentOrigin(),
    ]);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        reference: true,
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        total: true,
        paymentMethod: true,
        items: { select: { name: true, quantity: true, total: true } },
      },
    });

    if (!order) return;

    const shopName = settings.companyName || tenant.name;
    const palette = mailColors(settings.primaryColor, settings.accentColor);
    const lines: OrderLine[] = order.items.map(
      (item: { name: string; quantity: number; total: number }) => ({
        name: item.name,
        quantity: item.quantity,
        total: item.total,
      })
    );

    // --- Au client, s'il a laissé une adresse
    if (isEmail(order.clientEmail)) {
      const mail = orderConfirmation({
        colors: palette,
        shopName,
        customerName: order.clientName,
        reference: order.reference,
        lines,
        total: order.total,
        url: `${base}/commande/${order.id}`,
        note:
          order.paymentMethod === "A_LA_LIVRAISON"
            ? settings.orderConfirmation
            : undefined,
      });

      sendMessageInBackground({
        to: { email: order.clientEmail, name: order.clientName },
        // Le client a commandé chez son commerçant : c'est ce nom qu'il doit
        // voir dans sa boîte, pas celui de la plateforme.
        fromName: shopName,
        replyTo: settings.companyEmail || undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    }

    // --- Au marchand
    if (isEmail(settings.companyEmail)) {
      const mail = orderAlert({
        colors: palette,
        shopName,
        reference: order.reference,
        customerName: order.clientName,
        customerPhone: order.clientPhone,
        total: order.total,
        url: `${base}/admin/commandes/${order.id}`,
      });

      sendMessageInBackground({
        to: { email: settings.companyEmail, name: shopName },
        fromName: shopName,
        // Répondre à l'alerte doit écrire au client, pas à soi-même.
        replyTo: isEmail(order.clientEmail) ? order.clientEmail : undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    }
  } catch (error) {
    console.error("[notify] commande :", error);
  }
}
