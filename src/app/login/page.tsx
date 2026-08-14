import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import LoginForm from "./LoginForm";
import { isTenantSuspended, requireTenant } from "@/lib/tenant";
import TenantSuspended from "@/components/TenantSuspended";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ suivant?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { suivant } = await searchParams;
  const [tenant, settings] = await Promise.all([requireTenant(), getSettings()]);

  // Sans ce contrôle, un marchand suspendu se connecterait normalement pour
  // découvrir ensuite que rien ne s'ouvre, sans explication.
  if (isTenantSuspended(tenant)) return <TenantSuspended name={tenant.name} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Le personnel se connecte chez lui : c'est le logo de sa boutique
              qui l'accueille, pas celui de la plateforme. Sans logo
              enregistré, le nom en toutes lettres — jamais d'image cassée,
              et surtout jamais le logo d'un autre marchand. */}
          <Link href="/" className="inline-block">
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={tenant.name}
                width={200}
                height={64}
                className="h-14 w-auto mx-auto object-contain"
                priority
              />
            ) : (
              <span className="font-display text-2xl font-bold text-brand-blue">
                {tenant.name}
              </span>
            )}
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-brand-blue">
            Espace de gestion
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Back-office et caisse — accès réservé au personnel
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
          <LoginForm next={suivant} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-blue transition-colors">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
