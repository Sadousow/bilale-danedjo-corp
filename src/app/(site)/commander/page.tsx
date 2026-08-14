import type { Metadata } from "next";

import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/tenant-db";
import { getSettings } from "@/lib/settings";
import { getShopSession } from "@/lib/shop-auth";
import { isTenantPaymentReady } from "@/lib/payment/tenant-djomy";
import { requireFeature } from "@/lib/subscription";
import { displayPhone } from "@/lib/orders";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commander",
  description: "Finalisez votre commande — livraison à Conakry et en Guinée.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  // Le tunnel est déjà refusé côté action ; on ferme aussi la page pour ne
  // pas laisser un client remplir un formulaire qui n'aboutira pas.
  await requireFeature("shop");

  const prisma = await db();
  const [zones, settings, session, paymentReady] = await Promise.all([
    prisma.deliveryZone.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { fee: "asc" }],
      select: { id: true, name: true, fee: true, freeAbove: true, delay: true },
    }),
    getSettings(),
    getShopSession(),
    isTenantPaymentReady(),
  ]);

  const customer = session
    ? await prisma.customer.findUnique({
        where: { id: session.sub },
        select: { name: true, phone: true, email: true, address: true },
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Dernière étape"
        title="Finaliser la commande"
        description="Livraison à Conakry et à l'intérieur du pays."
      />
      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CheckoutForm
            zones={zones}
            loggedIn={Boolean(session)}
            minOrderAmount={settings.minOrderAmount}
            onlinePaymentAvailable={
              settings.onlinePaymentEnabled && paymentReady
            }
            prefill={{
              name: customer?.name ?? "",
              phone: customer?.phone ? displayPhone(customer.phone) : "",
              email: customer?.email ?? "",
              address: customer?.address ?? "",
            }}
          />
        </div>
      </section>
    </>
  );
}
