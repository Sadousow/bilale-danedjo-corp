import { ImageResponse } from "next/og";

import { getSettings } from "@/lib/settings";
import { requireTenant } from "@/lib/tenant";
import { buildTheme } from "@/lib/theme";

/**
 * Icône d'onglet de la boutique.
 *
 * Sans elle, chaque boutique affichait l'icône de la plateforme : le client
 * d'un commerçant voyait la marque de son fournisseur de logiciel.
 *
 * C'est l'initiale du commerce sur sa couleur principale, et non son logo :
 * à 16 pixels une photo ou un logotype détaillé devient une tache illisible,
 * alors qu'une lettre reste nette. Beaucoup de marques procèdent ainsi pour
 * leur favicon, y compris quand elles ont un logo riche.
 */

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const [tenant, settings] = await Promise.all([requireTenant(), getSettings()]);
  const theme = buildTheme(settings.primaryColor, settings.accentColor);

  const name = (settings.companyName || tenant.name).trim();
  // Première lettre utile — on saute un éventuel article ou symbole.
  const initial = (name.match(/\p{L}/u)?.[0] ?? "B").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.primary,
          color: "#ffffff",
          fontSize: 40,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: "14px",
        }}
      >
        {initial}
      </div>
    ),
    size
  );
}
