import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { ShopConfigProvider } from "@/components/shop/shop-config";
import { getSettings } from "@/lib/settings";
import { isTenantSuspended, requireTenant } from "@/lib/tenant";
import TenantSuspended from "@/components/TenantSuspended";
import { getTenantSubscription } from "@/lib/subscription";
import { hasFeature, isShopClosed } from "@/lib/plans";
import { buildTheme, themeStyle } from "@/lib/theme";
import { presetStyle } from "@/lib/blocks";
import { previewDraft } from "@/lib/home-draft";
import { siteConfig } from "@/lib/site";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 404 explicite si le host ne correspond à aucune boutique.
  const tenant = await requireTenant();

  // Suspension décidée par la plateforme : rien n'est servi, pas même le
  // nom du commerce en grand.
  if (isTenantSuspended(tenant)) return <TenantSuspended name={tenant.name} />;

  const [settings, subscription] = await Promise.all([
    getSettings(),
    getTenantSubscription(),
  ]);

  /*
   * L'offre ne comprend pas la boutique en ligne : **aucune vitrine n'est
   * servie**. Ni catalogue, ni navigation, ni pages — seulement le nom du
   * commerce et de quoi le joindre.
   *
   * Masquer le seul panier serait une demi-mesure : le catalogue, les fiches
   * produit et les prix resteraient publics, c'est-à-dire l'essentiel de ce
   * que la boutique en ligne est censée apporter.
   *
   * Le personnel n'est pas concerné : /admin, /pos et /login ne passent pas
   * par cette mise en page.
   */
  if (!hasFeature(subscription.plan, "shop")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-brand-blue">
            {settings.companyName || tenant.name}
          </h1>
          <p className="mt-4 text-slate-600">
            Pour vos commandes et vos renseignements, contactez-nous
            directement.
          </p>
          {settings.companyPhone && (
            <p className="mt-6 text-lg font-semibold text-brand-blue">
              {settings.companyPhone}
            </p>
          )}
          {settings.companyAddress && (
            <p className="mt-2 text-sm text-slate-500">
              {settings.companyAddress}
            </p>
          )}
        </div>
      </div>
    );
  }

  /*
   * Boutique jamais publiée : elle n'a ni produit, ni logo, ni textes. La
   * servir donnerait une coquille vide à quiconque reçoit l'adresse — et
   * l'adresse circule vite, elle est dans l'email de bienvenue.
   */
  if (!settings.shopPublished && !isShopClosed(subscription.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-brand-blue">
            {settings.companyName || tenant.name}
          </h1>
          <p className="mt-4 text-slate-600">
            Cette boutique ouvre bientôt. Revenez d&apos;ici peu.
          </p>
          {settings.companyPhone && (
            <p className="mt-6 text-sm text-slate-500">
              Pour toute question : {settings.companyPhone}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Abonnement échu et délai de grâce épuisé : la vitrine ferme, mais on ne
  // laisse pas une page d'erreur brute — le visiteur n'y est pour rien.
  if (isShopClosed(subscription.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-brand-blue">
            {tenant.name}
          </h1>
          <p className="mt-4 text-slate-600">
            Cette boutique est momentanément fermée. Revenez d&apos;ici peu.
          </p>
          {settings.companyPhone && (
            <p className="mt-6 text-sm text-slate-500">
              Pour toute question : {settings.companyPhone}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Les couleurs du marchand écrasent les variables CSS de `globals.css` :
  // toute la vitrine se repeint sans qu'aucune classe ne change.
  const theme = buildTheme(settings.primaryColor, settings.accentColor);

  // En aperçu, l'administrateur voit le style qu'il est en train d'essayer ;
  // les visiteurs gardent le style publié.
  const draft = await previewDraft();
  const preset = draft?.preset ?? settings.themePreset;

  return (
    <ShopConfigProvider
      value={{
        name: settings.companyName,
        // Le slogan sert de titre au bandeau d'accueil : s'il est vide,
        // la page afficherait un titre blanc.
        slogan: settings.slogan || siteConfig.slogan,
        whatsappNumber: settings.whatsappNumber,
        phone: settings.companyPhone,
        email: settings.companyEmail,
        address: settings.companyAddress,
        logoUrl: settings.logoUrl,
        heroImageUrl: settings.heroImageUrl,
        heroEyebrow: settings.heroEyebrow,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle,
        highlights: settings.highlights,
        // Deux conditions : l'offre doit comprendre la vente en ligne, et le
        // marchand ne doit pas l'avoir fermée depuis ses réglages.
        ordersEnabled:
          hasFeature(subscription.plan, "shop") && settings.shopEnabled,
        openingHours: settings.openingHours || siteConfig.hours,
        social: {
          facebook: settings.socialFacebook,
          instagram: settings.socialInstagram,
          tiktok: settings.socialTiktok,
        },
      }}
    >
      <style>{`${themeStyle(theme)}:root{${presetStyle(preset)}}`}</style>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppFloat />
      </div>
    </ShopConfigProvider>
  );
}
