import { ShieldAlert } from "lucide-react";

import { brand } from "@/lib/brand";

/**
 * Boutique suspendue par la plateforme.
 *
 * Affiché à la place de tout : vitrine, back-office et caisse. C'est une
 * décision prise à la main pour un motif grave, et elle doit se voir.
 *
 * Le message reste sobre et ne donne pas de motif : cet écran est public sur
 * la vitrine, et il n'y a aucune raison d'exposer aux clients d'un commerçant
 * ce qu'on lui reproche.
 */
export default function TenantSuspended({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold text-slate-800">
          {name}
        </h1>

        <p className="mt-4 text-slate-600">
          Ce compte est suspendu. L&apos;accès à la boutique et à l&apos;espace
          de gestion est interrompu.
        </p>

        <p className="mt-6 text-sm text-slate-500">
          Si vous êtes le responsable de ce commerce, contactez {brand.name}
          {" "}pour connaître la marche à suivre.
        </p>
      </div>
    </div>
  );
}
