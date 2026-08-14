"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, PackagePlus } from "lucide-react";

import { adjustStockAction, type StockState } from "./actions";

type Product = { id: string; name: string; stock: number; unit: string | null };

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md transition-colors text-sm"
    >
      <PackagePlus className="w-4 h-4" />
      {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
    </button>
  );
}

export default function StockForm({ products }: { products: Product[] }) {
  const [state, formAction] = useActionState<StockState, FormData>(
    adjustStockAction,
    {}
  );
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"ENTREE" | "SORTIE" | "AJUSTEMENT">("ENTREE");

  const selected = products.find((p) => p.id === productId);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="productId">
            Produit
          </label>
          <select
            id="productId"
            name="productId"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={input}
          >
            <option value="">— Choisir un produit —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — stock : {p.stock}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="type">
            Type de mouvement
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "ENTREE" | "SORTIE" | "AJUSTEMENT")
            }
            className={input}
          >
            <option value="ENTREE">Entrée — réapprovisionnement</option>
            <option value="SORTIE">Sortie — perte, casse, don</option>
            <option value="AJUSTEMENT">Ajustement — inventaire</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor="quantity">
            {type === "AJUSTEMENT" ? "Stock réel compté" : "Quantité"}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={type === "AJUSTEMENT" ? 0 : 1}
            step={1}
            required
            className={input}
          />
          {selected && (
            <p className="mt-1 text-xs text-slate-400">
              Stock actuel : {selected.stock} {selected.unit ?? ""}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="reason">
            Motif / référence
          </label>
          <input
            id="reason"
            name="reason"
            className={input}
            placeholder="Livraison fournisseur du 12/08, casse en rayon…"
          />
        </div>
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

      <Submit />
    </form>
  );
}
