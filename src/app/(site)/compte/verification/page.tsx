import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { confirmEmail } from "@/lib/email-verification";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Confirmation de votre adresse",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jeton?: string }> };

export default async function VerificationPage({ searchParams }: Props) {
  const { jeton } = await searchParams;
  const tenant = await requireTenant();
  const result = await confirmEmail(jeton);

  return (
    <section className="py-20">
      <div className="max-w-md mx-auto px-4 text-center">
        {result.ok ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h1 className="mt-5 font-display text-2xl font-bold text-brand-blue">
              Adresse confirmée
            </h1>
            <p className="mt-3 text-slate-600">
              Merci{result.name ? ` ${result.name}` : ""}, votre compte chez{" "}
              {tenant.name} est maintenant sécurisé.
            </p>
            <Link
              href="/compte"
              className="mt-8 inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Voir mon compte
            </Link>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="mt-5 font-display text-2xl font-bold text-brand-blue">
              Lien invalide
            </h1>
            <p className="mt-3 text-slate-600">
              Ce lien a déjà servi, ou il a plus de deux jours. Votre compte
              fonctionne normalement — vous pouvez demander une nouvelle
              confirmation depuis votre espace.
            </p>
            <Link
              href="/compte"
              className="mt-8 inline-block text-brand-blue hover:text-brand-gold font-semibold"
            >
              Aller à mon compte
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
