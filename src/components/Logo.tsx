"use client";

import Link from "next/link";
import Image from "next/image";

import { useShopConfig } from "./shop/shop-config";

type Props = {
  size?: "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10",
  md: "h-12 sm:h-14",
  lg: "h-16 sm:h-20",
};

const textClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
};

export default function Logo({ size = "md" }: Props) {
  const shop = useShopConfig();

  return (
    <Link
      href="/"
      aria-label={`Accueil — ${shop.name}`}
      className="inline-block"
    >
      {shop.logoUrl ? (
        <Image
          src={shop.logoUrl}
          alt={shop.name}
          width={771}
          height={488}
          priority
          sizes="(min-width: 1024px) 240px, 180px"
          className={`${sizeClass[size]} w-auto object-contain transition-transform hover:scale-[1.03]`}
        />
      ) : (
        // Sans logo téléversé, le nom de la boutique tient lieu d'identité :
        // mieux vaut un mot lisible qu'une image cassée.
        <span
          className={`font-display font-bold text-brand-blue ${textClass[size]}`}
        >
          {shop.name}
        </span>
      )}
    </Link>
  );
}
