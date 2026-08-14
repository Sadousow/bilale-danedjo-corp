import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

import { getTenant } from "@/lib/tenant";
import { currentOrigin } from "@/lib/site-url";
import { brand } from "@/lib/brand";

/**
 * Une seule famille : Poppins, celle du logo.
 *
 * Playfair Display habillait les titres avant la marque Guÿgou. Il a été
 * retiré pour deux raisons : la cohérence avec le logotype, et surtout un
 * téléchargement de fonte en moins — ce qui se sent sur une connexion mobile
 * guinéenne, où chaque requête compte plus que l'élégance d'une serif.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

/**
 * Les métadonnées dépendent de la boutique : chaque marchand a son nom, son
 * adresse canonique et sa description. Rien ne peut être codé en dur ici,
 * sinon toutes les boutiques déclareraient le même domaine.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [tenant, origin] = await Promise.all([getTenant(), currentOrigin()]);

  if (!tenant) {
    return {
      metadataBase: new URL(origin),
      title: {
        default: "Gérez votre commerce, de la caisse à la livraison",
        template: `%s | ${brand.name}`,
      },
      description: brand.description,
    };
  }

  return {
    metadataBase: new URL(origin),
    title: {
      default: tenant.name,
      template: `%s | ${tenant.name}`,
    },
    description: `${tenant.name} — commandez en ligne, livraison à domicile.`,
    authors: [{ name: tenant.name }],
    openGraph: {
      type: "website",
      locale: "fr_GN",
      title: tenant.name,
      siteName: tenant.name,
      url: origin,
      /*
       * Adresse absolue construite depuis l'hôte réel de la requête.
       *
       * La convention de fichier `opengraph-image` résolvait l'adresse via
       * `metadataBase` et annonçait la vignette sur le domaine racine :
       * WhatsApp l'aurait cherchée sur `guygou.com` au lieu du sous-domaine
       * du marchand, et n'aurait rien affiché.
       */
      images: [
        {
          url: `${origin}/vignette`,
          width: 1200,
          height: 630,
          alt: tenant.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${origin}/vignette`],
    },
    robots: {
      // Une boutique en essai ou non publiée n'a rien à faire dans un moteur
      // de recherche : elle est souvent vide, et une page vide indexée est
      // difficile à faire oublier ensuite.
      index: tenant.status === "ACTIF",
      follow: tenant.status === "ACTIF",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-900">{children}</body>
    </html>
  );
}
