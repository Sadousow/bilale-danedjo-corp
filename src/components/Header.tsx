"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { Menu, User, X } from "lucide-react";
import Logo from "./Logo";
import WhatsAppIcon from "./WhatsAppIcon";
import CartButton from "./shop/CartButton";
import { useShopConfig } from "@/components/shop/shop-config";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/produits", label: "Produits" },
  { href: "/promotions", label: "Promotions" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const shop = useShopConfig();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const headerShadow = useTransform(scrollY, [0, 80], ["0 0 0 rgba(0,0,0,0)", "0 4px 20px rgba(11,46,99,0.08)"]);
  const headerBg = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0.85)", "rgba(255,255,255,0.98)"]);

  return (
    <motion.header
      style={{ boxShadow: headerShadow, backgroundColor: headerBg }}
      className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-200/60"
    >
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
                  className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "text-brand-blue"
                      : "text-slate-700 hover:text-brand-blue"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-brand-blue/5 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-1">
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="p-2 text-slate-600 hover:text-brand-blue transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>
            <CartButton className="mr-2" />
            {/* Sans numéro renseigné, `whatsappLink` rend une chaîne vide :
                le bouton rechargeait la page au lieu d'ouvrir WhatsApp. */}
            {shop.whatsappNumber && (
              <motion.a
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                href={shop.whatsappLink("Bonjour, je souhaite obtenir des informations.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Commander
              </motion.a>
            )}
          </div>

          <div className="flex items-center lg:hidden">
            <CartButton />
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-2 text-slate-700 hover:text-brand-blue"
              aria-label="Menu"
            >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "close" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="block"
              >
                {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.span>
            </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="lg:hidden bg-white border-t border-slate-200 overflow-hidden"
          >
            <nav className="px-4 py-3 space-y-1">
              {links.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-3 rounded-md text-base font-medium ${
                        active ? "text-brand-blue bg-brand-blue/5" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: links.length * 0.04 }}
              >
                <Link
                  href="/compte"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mon compte
                </Link>
              </motion.div>
              {shop.whatsappNumber && (
                <motion.a
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (links.length + 1) * 0.04 }}
                  href={shop.whatsappLink("Bonjour, je souhaite obtenir des informations.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-3 rounded-md font-semibold mt-2"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  Commander sur WhatsApp
                </motion.a>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
