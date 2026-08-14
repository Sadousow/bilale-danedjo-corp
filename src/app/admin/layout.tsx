import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { brand, logos } from "@/lib/brand";
import Link from "next/link";
import { LogOut, ShieldAlert } from "lucide-react";

import { AdminSidebarNav, AdminMobileNav } from "@/components/admin/AdminNav";
import { requireRole } from "@/lib/auth";
import { isTenantSuspended, requireTenant } from "@/lib/tenant";
import TenantSuspended from "@/components/TenantSuspended";
import { getTenantSubscription } from "@/lib/subscription";
import {
  hasFeature,
  isAdminPathOpenWhenUnpaid,
  isShopClosed,
  PATHNAME_HEADER,
} from "@/lib/plans";
import { roleLabels } from "@/lib/format";
import { logoutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s | Back-office" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("GERANT");

  /*
   * Suspension par la plateforme : tout est fermé. Un agent connecté « en
   * tant que » passe outre — c'est justement quand une boutique est
   * suspendue qu'on a besoin de regarder dedans.
   */
  const tenant = await requireTenant();
  if (isTenantSuspended(tenant) && !session.impersonatedBy) {
    return <TenantSuspended name={tenant.name} />;
  }

  const subscription = await getTenantSubscription();

  /*
   * Boutique fermée faute de paiement : le back-office se réduit à
   * « Abonnement » et « Rapports ». C'est une fermeture très différente de la
   * suspension par la plateforme — celle-ci se règle en payant, et il faut
   * donc laisser au marchand l'écran pour le faire.
   */
  const unpaid = isShopClosed(subscription.status);
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/admin";

  if (unpaid && !isAdminPathOpenWhenUnpaid(pathname)) {
    redirect("/admin/abonnement?ferme=1");
  }

  /*
   * Sections que l'offre ne couvre pas. Elles restent dans le menu, avec un
   * cadenas : les masquer serait plus propre, mais le marchand ignorerait ce
   * qu'il pourrait avoir — et ne monterait donc jamais d'offre.
   */
  const locked = (["shop", "invoicing"] as const).filter(
    (feature) => !hasFeature(subscription.plan, feature)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {subscription.notice && (
        <div
          className={`px-4 py-2.5 text-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center ${
            subscription.notice.tone === "danger"
              ? "bg-red-600 text-white"
              : subscription.notice.tone === "warning"
                ? "bg-amber-500 text-white"
                : "bg-brand-blue text-white"
          }`}
        >
          <span>{subscription.notice.message}</span>
          <Link
            href="/admin/abonnement"
            className="underline font-medium whitespace-nowrap"
          >
            Voir mon abonnement
          </Link>
        </div>
      )}

      {session.impersonatedBy && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 text-center">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Vous consultez ce back-office en tant que{" "}
            <strong>{session.name}</strong>, depuis la console plateforme
            ({session.impersonatedBy}). Toute action sera enregistrée au nom de
            ce marchand.
          </span>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 p-4">
          {/* Le back-office est l'outil de Guÿgou, pas la devanture du
              marchand : c'est la marque de la plateforme qui s'affiche ici,
              comme dans n'importe quel logiciel en location. */}
          <Link href="/admin" aria-label={brand.name} className="block mb-8 px-1">
            <Image
              src={logos.full}
              alt={brand.name}
              width={340}
              height={120}
              className="h-9 w-auto"
            />
          </Link>

          <AdminSidebarNav role={session.role} locked={locked} unpaid={unpaid} />

          <div className="mt-auto pt-6 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {session.name}
            </p>
            <p className="text-xs text-slate-500 mb-3">{roleLabels[session.role]}</p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <Link href="/admin" className="font-display font-bold text-brand-blue">
              Back-office
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-slate-400 hover:text-red-600"
                aria-label="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </header>

          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
        </div>
      </div>

      <AdminMobileNav role={session.role} locked={locked} unpaid={unpaid} />
    </div>
  );
}
