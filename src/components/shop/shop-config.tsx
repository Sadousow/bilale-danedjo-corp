"use client";

import { createContext, useContext, useMemo } from "react";

import { buildWhatsAppLink } from "@/lib/site";
import type { Highlight } from "@/lib/theme";

/**
 * Identité de la boutique affichée, transmise du serveur aux composants
 * clients. C'est elle qui remplace la constante `siteConfig` : en
 * multi-tenant, tout change d'une boutique à l'autre.
 */
export type ShopConfig = {
  name: string;
  slogan: string;
  whatsappNumber: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  heroImageUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  highlights: Highlight[];
  /**
   * La boutique accepte-t-elle des commandes en ligne ?
   *
   * Faux quand l'offre du marchand ne comprend pas la vente en ligne, ou
   * quand il l'a désactivée. La vitrine devient alors un catalogue : les
   * boutons d'ajout au panier disparaissent, plutôt que de laisser un client
   * remplir son panier pour se voir refusé à la dernière étape.
   */
  ordersEnabled: boolean;
  openingHours: string;
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
  };
};

const ShopConfigContext = createContext<ShopConfig | null>(null);

export function ShopConfigProvider({
  value,
  children,
}: {
  value: ShopConfig;
  children: React.ReactNode;
}) {
  return (
    <ShopConfigContext.Provider value={value}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export function useShopConfig(): ShopConfig & {
  whatsappLink: (message: string) => string;
} {
  const config = useContext(ShopConfigContext);
  if (!config) {
    throw new Error(
      "useShopConfig doit être utilisé à l'intérieur de <ShopConfigProvider>."
    );
  }

  return useMemo(
    () => ({
      ...config,
      whatsappLink: (message: string) =>
        buildWhatsAppLink(config.whatsappNumber, message),
    }),
    [config]
  );
}
