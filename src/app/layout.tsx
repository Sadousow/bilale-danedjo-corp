import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bilale-danedjo.com"),
  title: {
    default: "Bilale et Danedjo Corporation SARLU — Votre partenaire du quotidien",
    template: "%s | Bilale et Danedjo Corporation",
  },
  description:
    "Bilale et Danedjo Corporation SARLU — alimentation générale, produits d'entretien et électroménager en Guinée. Distribution et commerce de détail à Conakry.",
  keywords: [
    "alimentation générale Guinée",
    "électroménager Conakry",
    "produits d'entretien Guinée",
    "commerce général Guinée",
    "Bilale et Danedjo",
    "distribution Conakry",
  ],
  authors: [{ name: "Bilale et Danedjo Corporation SARLU" }],
  openGraph: {
    type: "website",
    locale: "fr_GN",
    title: "Bilale et Danedjo Corporation SARLU",
    description: "Votre partenaire du quotidien — alimentation, entretien, électroménager.",
    siteName: "Bilale et Danedjo Corporation",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
