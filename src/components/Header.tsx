"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import WhatsAppIcon from "./WhatsAppIcon";
import { whatsappLink } from "@/lib/site";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/produits", label: "Produits" },
  { href: "/promotions", label: "Promotions" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Logo />

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "text-brand-blue bg-brand-blue/5"
                      : "text-slate-700 hover:text-brand-blue hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a
              href={whatsappLink("Bonjour, je souhaite obtenir des informations.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Commander
            </a>
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-slate-700 hover:text-brand-blue"
            aria-label="Menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-white border-t border-slate-200">
          <nav className="px-4 py-3 space-y-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-md text-base font-medium ${
                    active
                      ? "text-brand-blue bg-brand-blue/5"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href={whatsappLink("Bonjour, je souhaite obtenir des informations.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-3 rounded-md font-semibold mt-2"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Commander sur WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
