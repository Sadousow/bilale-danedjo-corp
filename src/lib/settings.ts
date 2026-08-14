import "server-only";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireTenant } from "@/lib/tenant";
import {
  parseHighlights,
  DEFAULT_PRIMARY,
  DEFAULT_ACCENT,
  type Highlight,
} from "@/lib/theme";
import { parseBlocks, parseThemePreset, type Block, type ThemePreset } from "@/lib/blocks";

export type CompanySettings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  whatsappNumber: string;
  slogan: string;
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  accentColor: string;
  themePreset: ThemePreset;
  homeBlocks: Block[];
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  highlights: Highlight[];
  aboutText: string;
  openingHours: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTiktok: string;
  nif: string;
  rccm: string;
  bankName: string;
  bankAccount: string;
  bankIban: string;
  bankSwift: string;
  defaultVatRate: number;
  vatEnabledByDefault: boolean;
  paymentTerms: string;
  proformaValidityDays: number;
  documentFooter: string;
  signatureLabel: string;
  shopPublished: boolean;
  shopEnabled: boolean;
  onlinePaymentEnabled: boolean;
  minOrderAmount: number;
  orderConfirmation: string;
};

function fallbackFor(name: string): CompanySettings {
  return {
    companyName: name,
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    whatsappNumber: "",
    slogan: "",
    logoUrl: "",
    heroImageUrl: "",
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    themePreset: parseThemePreset(null),
    homeBlocks: parseBlocks(null),
    heroEyebrow: "",
    heroTitle: "",
    heroSubtitle: "",
    highlights: parseHighlights(null),
    aboutText: "",
    openingHours: "",
    socialFacebook: "",
    socialInstagram: "",
    socialTiktok: "",
    nif: "",
    rccm: "",
    bankName: "",
    bankAccount: "",
    bankIban: "",
    bankSwift: "",
    defaultVatRate: 18,
    vatEnabledByDefault: true,
    paymentTerms: "Règlement à 30 jours à compter de la date de facturation.",
    proformaValidityDays: 30,
    documentFooter: "",
    signatureLabel: "Cachet et signature",
    // En repli — base injoignable — on sert la vitrine plutôt que de fermer
    // la boutique d'un marchand pour un incident technique.
    shopPublished: true,
    shopEnabled: true,
    onlinePaymentEnabled: false,
    minOrderAmount: 0,
    orderConfirmation:
      "Merci ! Nous vous appelons pour confirmer votre commande.",
  };
}

/** Réglages de la boutique courante, créés à la volée au premier appel. */
export async function getSettings(): Promise<CompanySettings> {
  const tenant = await requireTenant();

  try {
    const prisma = await db();
    const tenantId = await currentTenantId();

    const row = await prisma.settings.upsert({
      where: { tenantId },
      update: {},
      create: { companyName: tenant.name },
    });

    return {
      companyName: row.companyName,
      companyAddress: row.companyAddress,
      companyPhone: row.companyPhone,
      companyEmail: row.companyEmail,
      whatsappNumber: row.whatsappNumber,
      slogan: row.slogan,
      logoUrl: row.logoUrl,
      heroImageUrl: row.heroImageUrl,
      primaryColor: row.primaryColor,
      accentColor: row.accentColor,
      themePreset: parseThemePreset(row.themePreset),
      homeBlocks: parseBlocks(row.homeBlocks),
      heroEyebrow: row.heroEyebrow,
      heroTitle: row.heroTitle,
      heroSubtitle: row.heroSubtitle,
      highlights: parseHighlights(row.highlights),
      aboutText: row.aboutText,
      openingHours: row.openingHours,
      socialFacebook: row.socialFacebook,
      socialInstagram: row.socialInstagram,
      socialTiktok: row.socialTiktok,
      nif: row.nif,
      rccm: row.rccm,
      bankName: row.bankName,
      bankAccount: row.bankAccount,
      bankIban: row.bankIban,
      bankSwift: row.bankSwift,
      defaultVatRate: row.defaultVatRate,
      vatEnabledByDefault: row.vatEnabledByDefault,
      paymentTerms: row.paymentTerms,
      proformaValidityDays: row.proformaValidityDays,
      documentFooter: row.documentFooter,
      signatureLabel: row.signatureLabel,
      shopPublished: row.shopPublished,
      shopEnabled: row.shopEnabled,
      onlinePaymentEnabled: row.onlinePaymentEnabled,
      minOrderAmount: row.minOrderAmount,
      orderConfirmation: row.orderConfirmation,
    };
  } catch {
    return fallbackFor(tenant.name);
  }
}
