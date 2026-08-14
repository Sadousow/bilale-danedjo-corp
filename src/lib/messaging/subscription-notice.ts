import "server-only";

import { platformDb } from "@/lib/db";
import { brand } from "@/lib/brand";
import { sendMessage } from "./send";
import { subscriptionReminder, type SubscriptionNotice } from "./templates";
import { isEmail } from "./channel";

/**
 * Rappels d'abonnement, envoyés depuis la passe quotidienne de facturation.
 *
 * L'adresse visée est celle de l'**administrateur de la boutique**, pas celle
 * affichée sur la vitrine : un rappel d'impayé n'a rien à faire dans la boîte
 * générique que lisent les clients.
 *
 * Ces messages viennent de la plateforme et portent donc son nom — c'est
 * Guÿgou qui réclame son abonnement, pas le marchand qui s'écrit à lui-même.
 */

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";

/** Adresse du premier administrateur de la boutique. */
async function adminEmail(tenantId: string): Promise<{ email: string; name: string } | null> {
  try {
    const user = await platformDb.user.findFirst({
      where: { tenantId, role: "ADMIN", active: true },
      orderBy: { createdAt: "asc" },
      select: { email: true, name: true },
    });

    return user && isEmail(user.email)
      ? { email: user.email, name: user.name ?? "" }
      : null;
  } catch {
    return null;
  }
}

export async function sendSubscriptionNotice(input: {
  tenantId: string;
  notice: SubscriptionNotice;
  amount: number;
  dueDate: Date;
  graceDays?: number;
}): Promise<boolean> {
  try {
    const tenant = await platformDb.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, slug: true },
    });

    if (!tenant) return false;

    const recipient = await adminEmail(input.tenantId);
    if (!recipient) return false;

    const scheme = ROOT.includes("localhost") ? "http" : "https";
    const url = `${scheme}://${tenant.slug}.${ROOT}/admin/abonnement`;

    const mail = subscriptionReminder({
      shopName: tenant.name,
      notice: input.notice,
      amount: input.amount,
      dueDate: input.dueDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      url,
      graceDays: input.graceDays,
    });

    const result = await sendMessage({
      to: { email: recipient.email, name: recipient.name },
      fromName: brand.name,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    return result.ok;
  } catch (error) {
    console.error("[abonnement] rappel :", error);
    return false;
  }
}
