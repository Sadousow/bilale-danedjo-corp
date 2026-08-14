import type { Metadata } from "next";
import Link from "next/link";

import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ouvrir une boutique",
  description:
    "Créez votre boutique en ligne en une minute : catalogue, caisse, stock et facturation.",
};

export default function SignupPage() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

  return (
    <section className="py-16">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-brand-blue">
            Ouvrir votre boutique
          </h1>
          <p className="mt-3 text-slate-600">
            Une minute suffit. Vous pourrez tout modifier ensuite.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <SignupForm rootDomain={rootDomain} />
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-slate-500 hover:text-brand-blue">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </section>
  );
}
