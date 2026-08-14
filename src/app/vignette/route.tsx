import { ImageResponse } from "next/og";

import { getSettings } from "@/lib/settings";
import { getTenant } from "@/lib/tenant";
import { buildTheme } from "@/lib/theme";
import { brand, palette } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

/**
 * Vignette de partage, composée à la volée.
 *
 * C'est l'image qui apparaît quand un lien est collé dans WhatsApp — le canal
 * par lequel passe l'essentiel du commerce en Guinée. Sans elle, un marchand
 * qui partage sa boutique n'envoie qu'une adresse nue.
 *
 * **Pourquoi une route explicite et non le fichier `opengraph-image`.**
 * La convention de Next construit l'adresse de l'image à partir de
 * `metadataBase`, qui retombait sur le domaine racine : la vignette d'une
 * boutique était annoncée sur `guygou.com` au lieu de son sous-domaine, et
 * WhatsApp l'aurait cherchée au mauvais endroit. Ici, c'est la page qui
 * déclare l'adresse absolue, à partir de l'hôte réel de la requête.
 *
 * Le logo du marchand n'y figure pas volontairement : il faudrait le
 * télécharger depuis le stockage à chaque génération, et un échec ferait
 * tomber toute la vignette. Le nom sur la couleur du marchand ne peut pas
 * échouer.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getTenant();

  // Sur le domaine racine, la vignette est celle de la plateforme.
  const settings = tenant ? await getSettings() : null;

  const theme = settings
    ? buildTheme(settings.primaryColor, settings.accentColor)
    : { primary: palette.primary, accent: palette.accent };

  const name = settings?.companyName || tenant?.name || brand.name;

  // Sans slogan, un texte neutre sur le commerce — surtout pas l'argumentaire
  // de la plateforme, qui n'a rien à faire sur la carte de partage d'un
  // marchand.
  const tagline = tenant
    ? settings?.slogan || siteConfig.description
    : brand.description;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: theme.primary,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "90px",
            height: "10px",
            background: theme.accent,
            marginBottom: "44px",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: name.length > 28 ? 60 : 76,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: 34,
            opacity: 0.85,
            lineHeight: 1.3,
          }}
        >
          {tagline.slice(0, 110)}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
