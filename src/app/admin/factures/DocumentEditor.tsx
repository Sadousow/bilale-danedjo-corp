"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";

import { formatPrice } from "@/lib/format";
import {
  computeTotals,
  documentTypeLabels,
  lineTotal,
  type DocumentType,
} from "@/lib/documents";
import { saveDocumentAction, type DocumentInput } from "./actions";

export type EditorProduct = {
  id: string;
  name: string;
  price: number;
  unit: string | null;
  stock: number;
};

export type EditorCustomer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  nif: string | null;
  rccm: string | null;
};

export type EditorLine = {
  key: string;
  productId: string | null;
  name: string;
  description: string;
  unit: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
};

export type EditorValues = {
  id?: string;
  type: DocumentType;
  customerId: string | null;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientNif: string;
  clientRccm: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  vatEnabled: boolean;
  vatRate: number;
  discount: number;
  note: string;
  terms: string;
  deliveryAddress: string;
  lines: EditorLine[];
};

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";
const cell =
  "w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20";

let counter = 0;
function newKey() {
  counter += 1;
  return `line-${Date.now()}-${counter}`;
}

export function emptyLine(): EditorLine {
  return {
    key: newKey(),
    productId: null,
    name: "",
    description: "",
    unit: null,
    unitPrice: 0,
    quantity: 1,
    discount: 0,
  };
}

export default function DocumentEditor({
  values,
  products,
  customers,
}: {
  values: EditorValues;
  products: EditorProduct[];
  customers: EditorCustomer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditorValues>(values);

  const isDelivery = form.type === "BON_LIVRAISON";
  const isProforma = form.type === "PROFORMA";

  const totals = useMemo(
    () =>
      computeTotals({
        lines: form.lines,
        discount: form.discount,
        vatEnabled: form.vatEnabled && !isDelivery,
        vatRate: form.vatRate,
      }),
    [form.lines, form.discount, form.vatEnabled, form.vatRate, isDelivery]
  );

  function update<K extends keyof EditorValues>(key: K, value: EditorValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  }

  function removeLine(key: string) {
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== key) }));
  }

  function pickProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateLine(key, { productId: null });
      return;
    }
    // Le catalogue est en TTC ; on convertit en HT si la TVA est active.
    const unitPrice =
      form.vatEnabled && !isDelivery
        ? Math.round(product.price / (1 + form.vatRate / 100))
        : product.price;

    updateLine(key, {
      productId: product.id,
      name: product.name,
      unit: product.unit,
      unitPrice,
    });
  }

  function pickCustomer(customerId: string) {
    if (!customerId) {
      update("customerId", null);
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setForm((f) => ({
      ...f,
      customerId: customer.id,
      clientName: customer.name,
      clientPhone: customer.phone ?? "",
      clientAddress: customer.address ?? "",
      clientNif: customer.nif ?? "",
      clientRccm: customer.rccm ?? "",
      deliveryAddress: f.deliveryAddress || customer.address || "",
    }));
  }

  function submit() {
    setError(null);

    const payload: DocumentInput = {
      id: form.id,
      type: form.type,
      customerId: form.customerId,
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientAddress: form.clientAddress,
      clientNif: form.clientNif,
      clientRccm: form.clientRccm,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      validUntil: form.validUntil,
      vatEnabled: form.vatEnabled && !isDelivery,
      vatRate: form.vatRate,
      discount: form.discount,
      note: form.note,
      terms: form.terms,
      deliveryAddress: form.deliveryAddress,
      lines: form.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        description: l.description,
        unit: l.unit,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        discount: l.discount,
      })),
    };

    startTransition(async () => {
      const result = await saveDocumentAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/factures/${result.id}`);
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Client */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Client</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="customer">
              Client enregistré
            </label>
            <select
              id="customer"
              value={form.customerId ?? ""}
              onChange={(e) => pickCustomer(e.target.value)}
              className={input}
            >
              <option value="">— Saisie libre —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="clientName">
              Nom / raison sociale *
            </label>
            <input
              id="clientName"
              value={form.clientName}
              onChange={(e) => update("clientName", e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="clientPhone">
              Téléphone
            </label>
            <input
              id="clientPhone"
              value={form.clientPhone}
              onChange={(e) => update("clientPhone", e.target.value)}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="clientAddress">
              Adresse
            </label>
            <input
              id="clientAddress"
              value={form.clientAddress}
              onChange={(e) => update("clientAddress", e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="clientNif">
              NIF du client
            </label>
            <input
              id="clientNif"
              value={form.clientNif}
              onChange={(e) => update("clientNif", e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="clientRccm">
              RCCM du client
            </label>
            <input
              id="clientRccm"
              value={form.clientRccm}
              onChange={(e) => update("clientRccm", e.target.value)}
              className={input}
            />
          </div>
        </div>
      </div>

      {/* Dates et TVA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">
          {documentTypeLabels[form.type]} — informations
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label} htmlFor="issueDate">
              Date d&apos;émission
            </label>
            <input
              id="issueDate"
              type="date"
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className={input}
            />
          </div>

          {isProforma && (
            <div>
              <label className={label} htmlFor="validUntil">
                Valable jusqu&apos;au
              </label>
              <input
                id="validUntil"
                type="date"
                value={form.validUntil}
                onChange={(e) => update("validUntil", e.target.value)}
                className={input}
              />
            </div>
          )}

          {form.type === "FACTURE" && (
            <div>
              <label className={label} htmlFor="dueDate">
                Échéance de règlement
              </label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
                className={input}
              />
            </div>
          )}

          {isDelivery && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor="deliveryAddress">
                Lieu de livraison
              </label>
              <input
                id="deliveryAddress"
                value={form.deliveryAddress}
                onChange={(e) => update("deliveryAddress", e.target.value)}
                className={input}
              />
            </div>
          )}
        </div>

        {!isDelivery && (
          <div className="flex flex-wrap items-end gap-4 pt-2">
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.vatEnabled}
                onChange={(e) => update("vatEnabled", e.target.checked)}
                className="w-4 h-4 accent-brand-blue"
              />
              Appliquer la TVA
            </label>

            {form.vatEnabled && (
              <div>
                <label className="block text-xs text-slate-500 mb-1" htmlFor="vatRate">
                  Taux (%)
                </label>
                <input
                  id="vatRate"
                  type="number"
                  min={0}
                  max={100}
                  value={form.vatRate}
                  onChange={(e) => update("vatRate", Number(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
            )}

            {!form.vatEnabled && (
              <p className="text-xs text-slate-400">
                Document émis en exonération de TVA.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lignes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            Lignes {!isDelivery && <span className="text-slate-400 font-normal text-sm">(prix HT)</span>}
          </h2>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))
            }
            className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
          >
            <Plus className="w-4 h-4" />
            Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-2.5 w-[38%]">
                  Désignation
                </th>
                <th className="text-left font-medium px-2 py-2.5 w-24">Unité</th>
                <th className="text-right font-medium px-2 py-2.5 w-24">Qté</th>
                <th className="text-right font-medium px-2 py-2.5 w-32">
                  Prix unitaire
                </th>
                <th className="text-right font-medium px-2 py-2.5 w-28">Remise</th>
                <th className="text-right font-medium px-4 py-2.5 w-32">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.lines.map((line) => (
                <tr key={line.key} className="align-top">
                  <td className="px-4 py-2.5 space-y-1.5">
                    <select
                      value={line.productId ?? ""}
                      onChange={(e) => pickProduct(line.key, e.target.value)}
                      className={`${cell} text-slate-500`}
                    >
                      <option value="">— Ligne libre —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={line.name}
                      onChange={(e) =>
                        updateLine(line.key, { name: e.target.value })
                      }
                      placeholder="Désignation"
                      className={cell}
                    />
                    <input
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.key, { description: e.target.value })
                      }
                      placeholder="Précision (facultatif)"
                      className={`${cell} text-xs`}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={line.unit ?? ""}
                      onChange={(e) =>
                        updateLine(line.key, { unit: e.target.value || null })
                      }
                      className={cell}
                      placeholder="sac"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                      className={`${cell} text-right`}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.key, {
                          unitPrice: Number(e.target.value) || 0,
                        })
                      }
                      className={`${cell} text-right`}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={line.discount || ""}
                      onChange={(e) =>
                        updateLine(line.key, {
                          discount: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className={`${cell} text-right`}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {formatPrice(lineTotal(line))}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="p-1.5 text-slate-300 hover:text-red-600"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {form.lines.length === 0 && (
          <p className="text-center py-10 text-sm text-slate-400">
            Aucune ligne. Cliquez sur « Ajouter une ligne ».
          </p>
        )}
      </div>

      {/* Totaux */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Mentions</h2>

          {!isDelivery && (
            <div>
              <label className={label} htmlFor="terms">
                Conditions de paiement
              </label>
              <textarea
                id="terms"
                rows={2}
                value={form.terms}
                onChange={(e) => update("terms", e.target.value)}
                className={input}
              />
            </div>
          )}

          <div>
            <label className={label} htmlFor="note">
              Note interne / observation
            </label>
            <textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Récapitulatif</h2>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">
                Sous-total {!isDelivery && "HT"}
              </dt>
              <dd className="text-slate-800">{formatPrice(totals.subtotal)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="globalDiscount" className="text-slate-500">
                Remise globale
              </label>
              <input
                id="globalDiscount"
                type="number"
                min={0}
                max={totals.subtotal}
                value={form.discount || ""}
                onChange={(e) => update("discount", Number(e.target.value) || 0)}
                placeholder="0"
                className="w-32 px-2 py-1.5 border border-slate-200 rounded-md text-right text-sm"
              />
            </div>

            {!isDelivery && form.vatEnabled && (
              <>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <dt className="text-slate-500">Base imposable</dt>
                  <dd className="text-slate-800">
                    {formatPrice(totals.taxableBase)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">TVA {form.vatRate} %</dt>
                  <dd className="text-slate-800">
                    {formatPrice(totals.vatAmount)}
                  </dd>
                </div>
              </>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-200">
              <dt className="font-semibold text-slate-800">
                Total {!isDelivery && form.vatEnabled ? "TTC" : ""}
              </dt>
              <dd className="text-2xl font-bold text-brand-blue">
                {formatPrice(totals.total)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md text-sm"
        >
          <Save className="w-4 h-4" />
          {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
        </button>
        <Link
          href="/admin/factures"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Annuler
        </Link>
      </div>
    </div>
  );
}
