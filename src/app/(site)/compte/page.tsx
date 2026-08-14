import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Package } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/tenant-db";
import { getShopSession } from "@/lib/shop-auth";
import { formatPrice, formatDate } from "@/lib/format";
import {
  displayPhone,
  orderStatusPublic,
  orderStatusTone,
  orderStatusLabels,
  type OrderStatus,
} from "@/lib/orders";
import AccountForms from "./AccountForms";
import { logoutCustomerAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

const tones: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  gold: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
};

type Props = { searchParams: Promise<{ suivant?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const prisma = await db();
  const [{ suivant }, session] = await Promise.all([
    searchParams,
    getShopSession(),
  ]);

  if (!session) {
    return (
      <>
        <PageHeader
          eyebrow="Espace client"
          title="Mon compte"
          description="Connectez-vous pour suivre vos commandes et retrouver vos informations."
        />
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AccountForms next={suivant ?? "/compte"} />
          </div>
        </section>
      </>
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.sub },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!customer) {
    return (
      <>
        <PageHeader eyebrow="Espace client" title="Mon compte" />
        <section className="py-16 text-center">
          <p className="text-slate-500">Compte introuvable.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Espace client"
        title={`Bonjour, ${customer.name.split(" ")[0]}`}
        description="Vos commandes et vos informations de livraison."
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-800">{customer.name}</p>
              {customer.phone && (
                <p className="text-sm text-slate-500">
                  {displayPhone(customer.phone)}
                </p>
              )}
              {customer.email && (
                <p className="text-sm text-slate-500">{customer.email}</p>
              )}
              {customer.address && (
                <p className="text-sm text-slate-500">{customer.address}</p>
              )}
            </div>
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </form>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
              Mes commandes
            </h2>

            {customer.orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-slate-500 text-sm">
                  Vous n&apos;avez pas encore passé de commande.
                </p>
                <Link
                  href="/produits"
                  className="mt-5 inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-5 py-2.5 rounded-md text-sm"
                >
                  Découvrir le catalogue
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {customer.orders.map((order) => {
                  const status = order.status as OrderStatus;
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/commande/${order.id}`}
                        className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-blue transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800">
                              {order.reference}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatDate(order.createdAt)} —{" "}
                              {order._count.items} article(s)
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {orderStatusPublic[status]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-brand-blue">
                              {formatPrice(order.total)}
                            </p>
                            <span
                              className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[orderStatusTone[status]]}`}
                            >
                              {orderStatusLabels[status]}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
