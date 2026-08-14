"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";

import {
  addDomainAction,
  verifyDomainAction,
  setPrimaryDomainAction,
  deleteDomainAction,
  type DomainState,
} from "./domaines-actions";

export type AdminDomain = {
  id: string;
  host: string;
  verified: boolean;
  isPrimary: boolean;
  dns: {
    verification: { type: string; name: string; value: string };
    routing: { type: string; name: string; value: string };
    isApex: boolean;
  };
};

const cell =
  "font-mono text-[11px] bg-slate-100 rounded px-2 py-1 break-all select-all";

function Feedback({ state }: { state: DomainState }) {
  if (state.error) {
    return (
      <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        {state.ok}
      </p>
    );
  }
  return null;
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-md text-sm"
    >
      <Plus className="w-4 h-4" />
      {pending ? "Ajout…" : "Ajouter"}
    </button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline disabled:opacity-60"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Vérification…" : "Vérifier"}
    </button>
  );
}

export default function DomainsManager({
  domains,
  shopUrl,
}: {
  domains: AdminDomain[];
  shopUrl: string;
}) {
  const [addState, addAction] = useActionState<DomainState, FormData>(
    addDomainAction,
    {}
  );
  const [verifyState, verifyAction] = useActionState<DomainState, FormData>(
    verifyDomainAction,
    {}
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Votre boutique est accessible sur{" "}
        <span className="font-medium text-slate-700">{shopUrl}</span>. Vous
        pouvez y ajouter votre propre nom de domaine.
      </p>

      {domains.length > 0 && (
        <ul className="space-y-3">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-800">{domain.host}</span>

                {domain.verified ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                    Vérifié
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    En attente
                  </span>
                )}

                {domain.isPrimary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <Star className="w-3 h-3" />
                    Principal
                  </span>
                )}

                <div className="flex-1" />

                {!domain.verified && (
                  <form action={verifyAction}>
                    <input type="hidden" name="id" value={domain.id} />
                    <VerifyButton />
                  </form>
                )}

                {domain.verified && !domain.isPrimary && (
                  <form action={setPrimaryDomainAction}>
                    <input type="hidden" name="id" value={domain.id} />
                    <button
                      type="submit"
                      className="text-sm text-slate-500 hover:text-brand-blue"
                    >
                      Définir comme principal
                    </button>
                  </form>
                )}

                <form action={deleteDomainAction}>
                  <input type="hidden" name="id" value={domain.id} />
                  <button
                    type="submit"
                    className="p-1.5 text-slate-300 hover:text-red-600"
                    title="Retirer ce domaine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {!domain.verified && (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-sm text-slate-600">
                    Ajoutez ces deux enregistrements chez votre hébergeur de
                    domaine, puis cliquez sur « Vérifier ». La propagation peut
                    prendre jusqu&apos;à une heure.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="text-left font-medium pb-2">Type</th>
                          <th className="text-left font-medium pb-2">Nom</th>
                          <th className="text-left font-medium pb-2">Valeur</th>
                        </tr>
                      </thead>
                      <tbody className="align-top">
                        <tr>
                          <td className="pr-3 py-1">
                            <span className={cell}>
                              {domain.dns.verification.type}
                            </span>
                          </td>
                          <td className="pr-3 py-1">
                            <span className={cell}>
                              {domain.dns.verification.name}
                            </span>
                          </td>
                          <td className="py-1">
                            <span className={cell}>
                              {domain.dns.verification.value}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-3 py-1">
                            <span className={cell}>{domain.dns.routing.type}</span>
                          </td>
                          <td className="pr-3 py-1">
                            <span className={cell}>{domain.dns.routing.name}</span>
                          </td>
                          <td className="py-1">
                            <span className={cell}>{domain.dns.routing.value}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Feedback state={verifyState} />

      <form action={addAction} className="flex flex-col sm:flex-row gap-3">
        <input
          name="host"
          placeholder="maboutique.com"
          className="flex-1 px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        <AddButton />
      </form>

      <Feedback state={addState} />
    </div>
  );
}
