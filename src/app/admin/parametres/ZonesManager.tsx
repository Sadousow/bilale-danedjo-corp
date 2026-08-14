"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { saveZoneAction, deleteZoneAction, type ZoneState } from "./zones-actions";

export type AdminZone = {
  id: string;
  name: string;
  fee: number;
  freeAbove: number;
  delay: string;
  active: boolean;
  position: number;
};

const input =
  "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm";

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-md text-sm"
    >
      <Plus className="w-4 h-4" />
      {pending ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter la zone"}
    </button>
  );
}

export default function ZonesManager({ zones }: { zones: AdminZone[] }) {
  const [state, formAction] = useActionState<ZoneState, FormData>(
    saveZoneAction,
    {}
  );
  const [editing, setEditing] = useState<AdminZone | null>(null);

  return (
    <div className="space-y-5">
      {zones.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Zone</th>
                <th className="text-right font-medium px-3 py-2.5">Frais</th>
                <th className="text-right font-medium px-3 py-2.5">
                  Offerte dès
                </th>
                <th className="text-center font-medium px-3 py-2.5">État</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setEditing(zone)}
                      className="font-medium text-brand-blue hover:underline text-left"
                    >
                      {zone.name}
                    </button>
                    {zone.delay && (
                      <span className="block text-xs text-slate-400">
                        {zone.delay}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {zone.fee === 0 ? "Offerte" : formatPrice(zone.fee)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500">
                    {zone.freeAbove > 0 ? formatPrice(zone.freeAbove) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        zone.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {zone.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <form action={deleteZoneAction}>
                      <input type="hidden" name="id" value={zone.id} />
                      <button
                        type="submit"
                        className="p-1.5 text-slate-300 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={formAction}
        key={editing?.id ?? "new"}
        className="border border-slate-200 rounded-lg p-4 space-y-3"
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            {editing ? `Modifier « ${editing.name} »` : "Nouvelle zone"}
          </p>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Annuler
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="zone-name">
              Nom de la zone
            </label>
            <input
              id="zone-name"
              name="name"
              required
              defaultValue={editing?.name}
              className={input}
              placeholder="Conakry centre"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1" htmlFor="zone-fee">
              Frais (GNF)
            </label>
            <input
              id="zone-fee"
              name="fee"
              type="number"
              min={0}
              defaultValue={editing?.fee ?? 0}
              className={input}
            />
          </div>
          <div>
            <label
              className="block text-xs text-slate-500 mb-1"
              htmlFor="zone-freeAbove"
            >
              Offerte à partir de
            </label>
            <input
              id="zone-freeAbove"
              name="freeAbove"
              type="number"
              min={0}
              defaultValue={editing?.freeAbove ?? 0}
              className={input}
              placeholder="0 = jamais"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="zone-delay">
              Délai indicatif
            </label>
            <input
              id="zone-delay"
              name="delay"
              defaultValue={editing?.delay}
              className={input}
              placeholder="24 à 48 h"
            />
          </div>
          <div>
            <label
              className="block text-xs text-slate-500 mb-1"
              htmlFor="zone-position"
            >
              Ordre d&apos;affichage
            </label>
            <input
              id="zone-position"
              name="position"
              type="number"
              defaultValue={editing?.position ?? 0}
              className={input}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 pt-5">
            <input
              type="checkbox"
              name="active"
              defaultChecked={editing ? editing.active : true}
              className="w-4 h-4 accent-brand-blue"
            />
            Zone active
          </label>
        </div>

        {state.error && (
          <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {state.ok}
          </p>
        )}

        <Submit editing={Boolean(editing)} />
      </form>

      <p className="text-xs text-slate-400">
        Une zone déjà utilisée par des commandes est désactivée plutôt que
        supprimée, afin de préserver l&apos;historique.
      </p>
    </div>
  );
}
