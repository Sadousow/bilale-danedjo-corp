import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";

import { getPlatformSession } from "@/lib/platform-auth";
import { platformLogoutAction } from "./actions";

export const metadata: Metadata = {
  title: { default: "Console", template: "%s | Console" },
  robots: { index: false, follow: false },
};

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de garde ici : la page de connexion est un enfant de ce layout.
  // Chaque page protégée appelle `requirePlatformUser()`.
  const session = await getPlatformSession();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/superadmin" className="flex items-center gap-2 font-semibold">
            <Shield className="w-4 h-4 text-brand-gold" />
            Console plateforme
          </Link>

          {session && (
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/superadmin/abonnements"
                className="text-slate-300 hover:text-white"
              >
                Abonnements
              </Link>
              <Link
                href="/superadmin/journal"
                className="text-slate-300 hover:text-white"
              >
                Journal
              </Link>
              <span className="text-slate-400 hidden sm:inline">
                {session.name}
              </span>
              <form action={platformLogoutAction}>
                <button
                  type="submit"
                  className="text-slate-300 hover:text-white"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
