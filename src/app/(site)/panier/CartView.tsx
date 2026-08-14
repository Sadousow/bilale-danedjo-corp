"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { useCart } from "@/components/shop/cart";
import { formatPrice } from "@/lib/format";

export default function CartView({ minOrderAmount }: { minOrderAmount: number }) {
  const { lines, subtotal, ready, setQuantity, remove, clear } = useCart();

  if (!ready) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Chargement du panier…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="mt-4 text-slate-600">Votre panier est vide.</p>
        <Link
          href="/produits"
          className="mt-6 inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
        >
          Parcourir le catalogue
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const belowMinimum = minOrderAmount > 0 && subtotal < minOrderAmount;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {lines.map((line) => (
            <li key={line.sku} className="py-5 flex gap-4">
              <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {line.image && (
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {line.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatPrice(line.price)}
                      {line.unit && ` / ${line.unit}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(line.sku)}
                    className="text-slate-300 hover:text-red-600 p-1"
                    aria-label={`Retirer ${line.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity(line.sku, line.quantity - 1)}
                      className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                      aria-label="Diminuer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setQuantity(line.sku, Number(e.target.value) || 0)
                      }
                      className="w-14 h-9 text-center border border-slate-200 rounded-md text-sm"
                      aria-label={`Quantité pour ${line.name}`}
                    />
                    <button
                      onClick={() => setQuantity(line.sku, line.quantity + 1)}
                      className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                      aria-label="Augmenter"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-semibold text-brand-blue">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/produits"
            className="text-sm text-slate-500 hover:text-brand-blue"
          >
            ← Continuer mes achats
          </Link>
          <button
            onClick={clear}
            className="text-sm text-slate-400 hover:text-red-600"
          >
            Vider le panier
          </button>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
            Récapitulatif
          </h2>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Sous-total</dt>
              <dd className="font-medium text-slate-800">
                {formatPrice(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Livraison</dt>
              <dd className="text-slate-500">Calculée à l&apos;étape suivante</dd>
            </div>
          </dl>

          {belowMinimum && (
            <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Commande minimum : {formatPrice(minOrderAmount)}. Il manque{" "}
              {formatPrice(minOrderAmount - subtotal)}.
            </p>
          )}

          <Link
            href={belowMinimum ? "/produits" : "/commander"}
            className={`mt-5 flex items-center justify-center gap-2 w-full font-semibold px-4 py-3 rounded-md transition-colors ${
              belowMinimum
                ? "bg-slate-200 text-slate-500 pointer-events-none"
                : "bg-brand-gold hover:bg-brand-gold-dark text-white"
            }`}
          >
            Passer commande
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="mt-4 text-xs text-slate-500 text-center">
            Paiement à la livraison ou en ligne. Livraison à Conakry et à
            l&apos;intérieur du pays.
          </p>
        </div>
      </div>
    </div>
  );
}
