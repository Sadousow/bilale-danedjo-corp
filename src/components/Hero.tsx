"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShoppingBasket, SprayCan, Refrigerator } from "lucide-react";
import { siteConfig, whatsappLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";

export default function Hero() {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0.2 : 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative overflow-hidden bg-brand-gradient">
      <div className="absolute inset-0 opacity-10" aria-hidden>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-brand-gold rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <motion.span
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-brand-gold-light bg-white/10 px-4 py-1.5 rounded-full backdrop-blur"
            >
              <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
              Distribution & commerce — Conakry
            </motion.span>

            <motion.h1
              {...fadeUp(0.1)}
              className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
            >
              {siteConfig.slogan.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-brand-gold-light">{siteConfig.slogan.split(" ").slice(-1)}</span>
            </motion.h1>

            <motion.p {...fadeUp(0.2)} className="mt-5 text-lg text-slate-200 max-w-xl">
              Alimentation générale, produits d&apos;entretien et électroménager —
              à des prix justes, livrés rapidement à Conakry et partout en Guinée.
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="mt-8 flex flex-wrap gap-4">
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-6 py-3.5 rounded-md font-semibold shadow-lg transition-colors"
                >
                  Découvrir nos produits
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.a
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={{ scale: 0.97 }}
                href={whatsappLink("Bonjour, je souhaite passer commande.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-6 py-3.5 rounded-md font-semibold transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Commander sur WhatsApp
              </motion.a>
            </motion.div>

            <motion.div {...fadeUp(0.45)} className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { value: "500+", label: "Produits disponibles" },
                { value: "1 000+", label: "Clients satisfaits" },
                { value: "24h", label: "Délai moyen" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-brand-gold-light">{stat.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: reduceMotion ? 0 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="relative aspect-square rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-3 h-full">
                {[
                  {
                    Icon: ShoppingBasket,
                    title: "Alimentation générale",
                    desc: "Riz, sucre, huile, conserves…",
                    cls: "rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-dark p-5 flex flex-col justify-end text-white",
                    span: false,
                  },
                  {
                    Icon: SprayCan,
                    title: "Produits d'entretien",
                    desc: "Détergents, javel, savons…",
                    cls: "rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue",
                    span: false,
                  },
                  {
                    Icon: Refrigerator,
                    title: "Électroménager",
                    desc: "Réfrigérateurs, téléviseurs, ventilateurs, cuisinières…",
                    cls: "rounded-xl bg-white p-5 flex flex-col justify-end text-brand-blue col-span-2",
                    span: true,
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.12, ease: "easeOut" }}
                    whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
                    className={card.cls}
                  >
                    <card.Icon className="w-9 h-9" strokeWidth={1.5} />
                    <p className="font-semibold mt-3">{card.title}</p>
                    <p className="text-xs opacity-90 mt-1">{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
