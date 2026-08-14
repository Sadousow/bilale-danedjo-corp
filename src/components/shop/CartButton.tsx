"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useCart } from "./cart";
import { useShopConfig } from "./shop-config";

export default function CartButton({ className }: { className?: string }) {
  const { count, ready } = useCart();
  const { ordersEnabled } = useShopConfig();

  // Catalogue seul : pas de panier dans l'en-tête.
  if (!ordersEnabled) return null;

  return (
    <Link
      href="/panier"
      aria-label={`Panier${count > 0 ? ` — ${count} article(s)` : ""}`}
      className={`relative inline-flex items-center justify-center p-2 text-slate-600 hover:text-brand-blue transition-colors ${className ?? ""}`}
    >
      <ShoppingBag className="w-5 h-5" />
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-brand-gold text-white text-[10px] font-bold rounded-full">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
