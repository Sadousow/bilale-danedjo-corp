"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";

import { useCart, type CartLine } from "./cart";
import { useShopConfig } from "./shop-config";

type Props = {
  line: Omit<CartLine, "quantity">;
  disabled?: boolean;
  className?: string;
};

export default function AddToCartButton({ line, disabled, className }: Props) {
  const { add } = useCart();
  const { ordersEnabled } = useShopConfig();
  const [added, setAdded] = useState(false);

  // Catalogue seul : le bouton disparaît. Les appels à commander sur
  // WhatsApp, eux, restent en place — c'est par là que passe la vente.
  if (!ordersEnabled) return null;

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-400 text-sm font-semibold px-4 py-2.5 rounded-md cursor-not-allowed ${className ?? ""}`}
      >
        Indisponible
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        add(line);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={`inline-flex items-center justify-center gap-2 w-full text-sm font-semibold px-4 py-2.5 rounded-md transition-colors ${
        added
          ? "bg-emerald-600 text-white"
          : "bg-brand-blue hover:bg-brand-blue-light text-white"
      } ${className ?? ""}`}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" />
          Ajouté
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          Ajouter
        </>
      )}
    </button>
  );
}
