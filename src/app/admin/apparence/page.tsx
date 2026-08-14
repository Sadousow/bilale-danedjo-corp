import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { currentOrigin } from "@/lib/site-url";
import { isStorageConfigured } from "@/lib/storage";
import { Card, PageTitle } from "@/components/admin/ui";
import AppearanceForm from "./AppearanceForm";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  await requireRole("ADMIN");

  const [settings, origin] = await Promise.all([getSettings(), currentOrigin()]);

  return (
    <>
      <PageTitle
        title="Apparence"
        description="Votre logo, vos couleurs et les textes de votre vitrine"
      />

      {!isStorageConfigured() && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 max-w-3xl">
          Le stockage d&apos;images n&apos;est pas configuré sur ce serveur :
          vous pouvez modifier les couleurs et les textes, mais pas encore
          envoyer de logo. Contactez le support.
        </Card>
      )}

      <AppearanceForm
        shopUrl={origin}
        values={{
          logoUrl: settings.logoUrl,
          heroImageUrl: settings.heroImageUrl,
          primaryColor: settings.primaryColor,
          accentColor: settings.accentColor,
          heroEyebrow: settings.heroEyebrow,
          heroTitle: settings.heroTitle || settings.slogan,
          heroSubtitle: settings.heroSubtitle,
          highlights: settings.highlights,
          aboutText: settings.aboutText,
          openingHours: settings.openingHours,
          socialFacebook: settings.socialFacebook,
          socialInstagram: settings.socialInstagram,
          socialTiktok: settings.socialTiktok,
        }}
      />
    </>
  );
}
