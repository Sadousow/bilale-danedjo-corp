"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function PageHeader({ eyebrow, title, description }: Props) {
  const reduceMotion = useReducedMotion();
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0.2 : 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative bg-brand-gradient text-white overflow-hidden">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.12 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute -top-32 -right-24 w-96 h-96 bg-brand-gold rounded-full blur-3xl"
        aria-hidden
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {eyebrow && (
          <motion.p
            {...fadeUp(0)}
            className="text-xs font-semibold tracking-widest uppercase text-brand-gold-light mb-3"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 {...fadeUp(0.1)} className="font-display text-4xl sm:text-5xl font-bold">
          {title}
        </motion.h1>
        {description && (
          <motion.p {...fadeUp(0.2)} className="mt-4 text-slate-200 text-lg max-w-3xl">
            {description}
          </motion.p>
        )}
      </div>
    </section>
  );
}
