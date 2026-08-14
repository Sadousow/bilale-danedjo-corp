import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getHomeDraft } from "@/lib/home-draft";
import { featureGate } from "@/lib/subscription";
import FeatureLocked from "@/components/admin/FeatureLocked";
import { currentOrigin } from "@/lib/site-url";
import { PageTitle } from "@/components/admin/ui";
import HomeEditor from "./HomeEditor";

export const dynamic = "force-dynamic";

export default async function HomeLayoutPage() {
  await requireRole("ADMIN");

  /*
   * Cet écran ne compose qu'une chose : la page d'accueil de la vitrine.
   * Sans la boutique en ligne, cette vitrine n'est pas servie — l'éditeur
   * n'aurait donc rien à modifier.
   *
   * L'écran Apparence, lui, reste ouvert à toutes les offres : le logo et
   * les couleurs habillent aussi la caisse, les tickets et les factures.
   */
  const gate = await featureGate("shop");
  if (!gate.allowed) return <FeatureLocked gate={gate} />;

  const [settings, draft, origin] = await Promise.all([
    getSettings(),
    getHomeDraft(),
    currentOrigin(),
  ]);

  return (
    <>
      <PageTitle
        title="Page d'accueil"
        description="Composez votre page d'accueil, vérifiez le rendu, puis publiez"
      />

      {/*
       * L'éditeur reprend le brouillon s'il en existe un : on retrouve son
       * travail en revenant, même sans avoir publié. Sinon il part de la
       * page publiée.
       */}
      <HomeEditor
        initialBlocks={draft?.blocks ?? settings.homeBlocks}
        initialPreset={draft?.preset ?? settings.themePreset}
        publishedBlocks={settings.homeBlocks}
        publishedPreset={settings.themePreset}
        shopUrl={origin}
      />
    </>
  );
}
