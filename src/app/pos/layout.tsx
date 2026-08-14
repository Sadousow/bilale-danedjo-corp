import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, LogOut, ScanLine } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { hasRole } from "@/lib/session";
import { roleLabels } from "@/lib/format";
import { logoutAction } from "@/app/login/actions";
import { getSettings } from "@/lib/settings";
import { isTenantSuspended, requireTenant } from "@/lib/tenant";
import TenantSuspended from "@/components/TenantSuspended";
import { buildTheme, themeStyle } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Caisse", template: "%s | Caisse" },
  robots: { index: false, follow: false },
};

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const tenant = await requireTenant();
  if (isTenantSuspended(tenant) && !session.impersonatedBy) {
    return <TenantSuspended name={tenant.name} />;
  }

  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-slate-100">
      {/*
        La caisse porte les couleurs du marchand, contrairement au
        back-office. La différence n'est pas cosmétique : l'écran de caisse
        fait face au comptoir, et le client le regarde pendant qu'il paie.
      */}
      <style>{themeStyle(buildTheme(settings.primaryColor, settings.accentColor))}</style>
      <header className="bg-brand-blue text-white print:hidden">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-brand-gold" />
            <span className="font-display font-bold">Caisse</span>
            {/* Le nom de la boutique, pas celui du commerce d'origine :
                « Bilale & Danedjo » était écrit en dur, et s'affichait donc
                sur la caisse de tous les marchands. */}
            <span className="hidden sm:inline text-xs text-slate-300">
              {settings.companyName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {hasRole(session.role, "GERANT") && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-sm text-slate-200 hover:text-white"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Back-office</span>
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{session.name}</p>
              <p className="text-xs text-slate-300 leading-tight">
                {roleLabels[session.role]}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-slate-300 hover:text-white"
                aria-label="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
