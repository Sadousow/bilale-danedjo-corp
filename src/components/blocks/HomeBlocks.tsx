import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  MessageCircle,
  BadgePercent,
} from "lucide-react";

import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import CategoryIcon from "@/components/CategoryIcon";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { Block, BlockProps } from "@/lib/blocks";
import type { Category, Product } from "@/lib/products";
import type { Highlight } from "@/lib/theme";
import { buildWhatsAppLink } from "@/lib/site";

/** Les icônes des arguments restent fixes ; seuls les textes sont au marchand. */
const highlightIcons = [Truck, ShieldCheck, MessageCircle, BadgePercent];

export type CatalogCategory = {
  key: Category;
  label: string;
  description: string;
};

export type BlockData = {
  categories: CatalogCategory[];
  popular: Product[];
  promotions: Product[];
  recents: Product[];
  highlights: Highlight[];
  whatsappNumber: string;
};

type Tone = NonNullable<BlockProps["tone"]>;

const toneClass: Record<Tone, string> = {
  clair: "bg-white",
  gris: "bg-slate-50",
  fonce: "bg-gradient-to-br from-brand-blue to-brand-blue-light text-white",
};

function Section({
  tone = "clair",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <section
      className={toneClass[tone]}
      // L'espacement vient du thème choisi par le marchand.
      style={{
        paddingTop: "var(--shop-spacing, 4rem)",
        paddingBottom: "var(--shop-spacing, 4rem)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/**
 * En-tête de section. Sur fond coloré, les couleurs de texte s'inversent —
 * sans quoi un titre bleu marine sur bandeau bleu marine serait invisible.
 */
function Heading({
  eyebrow,
  title,
  description,
  tone = "clair",
  align = "center",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: Tone;
  align?: "left" | "center";
}) {
  if (!title && !eyebrow && !description) return null;
  const dark = tone === "fonce";

  return (
    <Reveal className={`max-w-2xl ${align === "center" ? "text-center mx-auto" : ""}`}>
      {eyebrow && (
        <p
          className={`text-xs font-semibold tracking-widest uppercase mb-3 ${
            dark ? "text-brand-gold-light" : "text-brand-gold"
          }`}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <h2
          className={`font-display text-3xl sm:text-4xl font-bold ${
            dark ? "text-white" : "text-brand-blue"
          }`}
        >
          {title}
        </h2>
      )}
      {description && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            dark ? "text-slate-200" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}

// ------------------------------------------------------------------ blocs

function CategoriesBlock({ props, data }: { props: BlockProps; data: BlockData }) {
  if (data.categories.length === 0) return null;

  return (
    <Section tone={props.tone}>
      <Heading {...props} tone={props.tone} />
      <Stagger
        className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        staggerDelay={0.1}
      >
        {data.categories.map((cat) => (
          <StaggerItem key={cat.key}>
            <Link
              href={`/produits?cat=${cat.key}`}
              className="shop-card group block bg-white border border-slate-200 p-8 hover:border-brand-gold h-full"
            >
              <div className="w-14 h-14 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <CategoryIcon category={cat.key} className="w-7 h-7" />
              </div>
              <h3 className="mt-5 font-display font-bold text-xl text-brand-blue">
                {cat.label}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {cat.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-gold group-hover:gap-2 transition-all">
                Voir les produits
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

function ProductsBlock({ props, data }: { props: BlockProps; data: BlockData }) {
  const source = props.source ?? "populaires";
  const pool =
    source === "promotions"
      ? data.promotions
      : source === "recents"
        ? data.recents
        : data.popular;

  const products = pool.slice(0, props.limit ?? 8);

  // Une section « Promotions » vide vaut mieux masquée qu'annoncée à vide.
  if (products.length === 0) return null;

  const dark = props.tone === "fonce";
  const href = source === "promotions" ? "/promotions" : "/produits";
  const linkLabel =
    source === "promotions" ? "Toutes les promotions" : "Voir tout le catalogue";

  return (
    <Section tone={props.tone}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <Heading {...props} tone={props.tone} align="left" />
        <Reveal delay={0.1}>
          <Link
            href={href}
            className={`text-sm font-semibold inline-flex items-center gap-1 ${
              dark
                ? "text-brand-gold-light hover:text-white"
                : "text-brand-blue hover:text-brand-gold"
            }`}
          >
            {linkLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>

      {/* Trois produits dans une grille de quatre laisseraient un vide : la
          grille suit le nombre demandé. */}
      <Stagger
        className={`mt-10 grid gap-5 ${
          products.length <= 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 lg:grid-cols-4"
        }`}
        staggerDelay={0.06}
      >
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard product={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

function HighlightsBlock({ props, data }: { props: BlockProps; data: BlockData }) {
  if (data.highlights.length === 0) return null;

  return (
    <Section tone={props.tone}>
      <Heading {...props} tone={props.tone} />
      <Stagger
        className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        staggerDelay={0.08}
      >
        {data.highlights.map((feat, index) => {
          const Icon = highlightIcons[index % highlightIcons.length];
          return (
            <StaggerItem key={`${feat.title}-${index}`}>
              <div
                className="shop-card bg-white border border-slate-200 p-6 hover:border-brand-gold/40 h-full"
              >
                <div className="w-12 h-12 rounded-lg bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-bold text-lg text-brand-blue">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{feat.text}</p>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}

function TextBlock({ props }: { props: BlockProps }) {
  if (!props.title && !props.body) return null;
  const dark = props.tone === "fonce";

  return (
    <Section tone={props.tone}>
      <div className="max-w-3xl mx-auto text-center">
        <Heading eyebrow={props.eyebrow} title={props.title} tone={props.tone} />
        {props.body && (
          <Reveal delay={0.1}>
            {/* Le texte est rendu tel quel : chaque ligne vide sépare un
                paragraphe. Aucune balise n'est interprétée. */}
            <div
              className={`mt-6 space-y-4 text-base sm:text-lg leading-relaxed ${
                dark ? "text-slate-200" : "text-slate-600"
              }`}
            >
              {props.body
                .split(/\n{2,}/)
                .map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
            </div>
          </Reveal>
        )}
        {props.buttonLabel && props.buttonHref && (
          <Reveal delay={0.15}>
            <Link
              href={props.buttonHref}
              className="mt-8 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-8 py-4 font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ borderRadius: "var(--shop-radius, 0.75rem)" }}
            >
              {props.buttonLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

function ImageBlock({ props }: { props: BlockProps }) {
  if (!props.imageUrl) return null;

  return (
    <section className={toneClass[props.tone ?? "clair"]}>
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1]">
        <Image
          src={props.imageUrl}
          alt={props.title ?? ""}
          fill
          sizes="100vw"
          className="object-cover"
        />
        {props.title && (
          <div className="absolute inset-0 bg-slate-900/45 flex items-center justify-center px-6">
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white text-center drop-shadow">
              {props.title}
            </h2>
          </div>
        )}
      </div>
    </section>
  );
}

function CallBlock({ props, data }: { props: BlockProps; data: BlockData }) {
  const dark = props.tone !== "clair" && props.tone !== "gris";
  // Sans numéro WhatsApp, le bouton mènerait nulle part : on bascule sur
  // la page contact plutôt que d'afficher un lien mort.
  const href = data.whatsappNumber
    ? buildWhatsAppLink(data.whatsappNumber, "Bonjour, je souhaite passer commande.")
    : "/contact";
  const external = Boolean(data.whatsappNumber);

  return (
    <section
      className={dark ? "bg-brand-blue-dark text-white" : toneClass[props.tone ?? "clair"]}
      style={{
        paddingTop: "var(--shop-spacing, 4rem)",
        paddingBottom: "var(--shop-spacing, 4rem)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          {props.title && (
            <h2
              className={`font-display text-3xl sm:text-4xl font-bold ${
                dark ? "text-white" : "text-brand-blue"
              }`}
            >
              {props.title}
            </h2>
          )}
          {props.body && (
            <p
              className={`mt-4 text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}
            >
              {props.body}
            </p>
          )}
        </Reveal>
        <Reveal delay={0.15}>
          <a
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="mt-8 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-8 py-4 font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ borderRadius: "var(--shop-radius, 0.75rem)" }}
          >
            <WhatsAppIcon className="w-5 h-5" />
            {props.buttonLabel ?? "Discuter sur WhatsApp"}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- assemblage

function renderBlock(block: Block, data: BlockData) {
  switch (block.type) {
    case "hero":
      return <Hero />;
    case "categories":
      return <CategoriesBlock props={block.props} data={data} />;
    case "produits":
      return <ProductsBlock props={block.props} data={data} />;
    case "arguments":
      return <HighlightsBlock props={block.props} data={data} />;
    case "texte":
      return <TextBlock props={block.props} />;
    case "image":
      return <ImageBlock props={block.props} />;
    case "appel":
      return <CallBlock props={block.props} data={data} />;
    default:
      // parseBlocks écarte déjà les types inconnus ; ce repli protège le jour
      // où un type sera retiré du code avant de l'être des enregistrements.
      return null;
  }
}

export default function HomeBlocks({
  blocks,
  data,
}: {
  blocks: Block[];
  data: BlockData;
}) {
  return (
    <>
      {blocks
        .filter((block) => block.visible)
        .map((block) => (
          <div key={block.id}>{renderBlock(block, data)}</div>
        ))}
    </>
  );
}
