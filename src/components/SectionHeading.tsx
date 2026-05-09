"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: Props) {
  const reduceMotion = useReducedMotion();
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: reduceMotion ? 0.2 : 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {eyebrow && (
        <motion.p
          {...fadeUp(0)}
          className="text-xs font-semibold tracking-widest uppercase text-brand-gold mb-3"
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h2
        {...fadeUp(0.08)}
        className="font-display text-3xl sm:text-4xl font-bold text-brand-blue"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          {...fadeUp(0.16)}
          className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
