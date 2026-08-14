import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { brand, logos } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: "Gérez votre commerce, de la caisse à la livraison",
    template: `%s | ${brand.name}`,
  },
  description:
    "Boutique en ligne, caisse, stock et facturation pour les commerçants de Guinée. Une seule application, sur votre propre adresse.",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label={brand.name} className="flex items-center">
            <Image
              src={logos.full}
              alt={brand.name}
              width={340}
              height={120}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#fonctionnalites" className="text-slate-600 hover:text-brand-blue">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="text-slate-600 hover:text-brand-blue">
              Tarifs
            </a>
            <Link
              href="/inscription"
              className="bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-4 py-2 rounded-md transition-colors"
            >
              Ouvrir ma boutique
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="font-semibold text-brand-blue">{brand.name}</span>
          <span>{brand.slogan}</span>
          <span className="ml-auto">
            © {new Date().getFullYear()} — Tous droits réservés.
          </span>
        </div>
      </footer>
    </div>
  );
}
