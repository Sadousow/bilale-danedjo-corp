import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { getPlatformSession } from "@/lib/platform-auth";
import PlatformLoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage() {
  if (await getPlatformSession()) redirect("/superadmin");

  return (
    <div className="max-w-sm mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto">
          <Shield className="w-5 h-5 text-brand-gold" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-800">
          Console plateforme
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Accès réservé à l&apos;équipe.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <PlatformLoginForm />
      </div>
    </div>
  );
}
