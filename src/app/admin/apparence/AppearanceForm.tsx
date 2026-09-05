"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Plus, Save, Trash2 } from "lucide-react";

import ImageUploader from "@/components/admin/ImageUploader";
import { buildTheme, DEFAULT_ACCENT, DEFAULT_PRIMARY } from "@/lib/theme";
import { saveAppearanceAction, type AppearanceInput } from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function ColorField({
  id,
  label: text,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-11 h-11 rounded-md border border-slate-300 cursor-pointer bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className={`${input} font-mono`}
          maxLength={7}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function AppearanceForm({
  values,
  shopUrl,
}: {
  values: AppearanceInput;
  shopUrl: string;
}) {
  const [form, setForm] = useState<AppearanceInput>(values);
  const [state, setState] = useState<{ ok?: string; error?: string }>({});
  const [pending, startTransition] = useTransition();

  function update<K extends keyof AppearanceInput>(
    key: K,
    value: AppearanceInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setState({});
  }

  function updateHighlight(index: number, patch: Partial<{ title: string; text: string }>) {
    setForm((f) => ({
      ...f,
      highlights: f.highlights.map((h, i) =>
        i === index ? { ...h, ...patch } : h
      ),
    }));
  }

  const theme = buildTheme(form.primaryColor, form.accentColor);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Aperçu */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Aperçu</h2>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
          >
            Ouvrir ma boutique
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div
          className="p-8 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
          }}
        >
          {form.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
          )}

          <div className="relative">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt=""
                className="h-10 w-auto object-contain mb-4 bg-white/90 rounded px-2 py-1 inline-block"
              />
            ) : null}

            {form.heroEyebrow && (
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: theme.accentLight }}
              >
                {form.heroEyebrow}
              </p>
            )}
            <p className="mt-2 font-display text-2xl font-bold">
              {form.heroTitle || "Titre de votre page d'accueil"}
            </p>
            {form.heroSubtitle && (
              <p className="mt-2 text-sm text-white/80 max-w-md">
                {form.heroSubtitle}
              </p>
            )}

            <span
              className="mt-5 inline-block px-4 py-2 rounded-md text-sm font-semibold"
              style={{ backgroundColor: theme.accent }}
            >
              Découvrir nos produits
            </span>
          </div>
        </div>
      </div>

      {/* Identité */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
        <h2 className="font-semibold text-slate-800">Identité visuelle</h2>

        <ImageUploader
          kind="logo"
          aspect="logo"
          maxSide={800}
          value={form.logoUrl}
          onChange={(url) => update("logoUrl", url)}
          label="Logo"
          hint="PNG à fond transparent de préférence. Sans logo, le nom de votre boutique s'affiche."
        />

        <ImageUploader
          kind="banniere"
          aspect="wide"
          maxSide={2000}
          value={form.heroImageUrl}
          onChange={(url) => update("heroImageUrl", url)}
          label="Photo de couverture"
          hint="Image large affichée derrière le titre d'accueil. Facultative."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <ColorField
            id="primaryColor"
            label="Couleur principale"
            value={form.primaryColor || DEFAULT_PRIMARY}
            onChange={(v) => update("primaryColor", v)}
            hint="En-têtes, titres, boutons secondaires."
          />
          <ColorField
            id="accentColor"
            label="Couleur d'accent"
            value={form.accentColor || DEFAULT_ACCENT}
            onChange={(v) => update("accentColor", v)}
            hint="Boutons d'action, promotions, mises en avant."
          />
        </div>
      </div>

      {/* Textes d'accueil */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Page d&apos;accueil</h2>

        <div>
          <label className={label} htmlFor="heroEyebrow">
            Petite mention au-dessus du titre
          </label>
          <input
            id="heroEyebrow"
            value={form.heroEyebrow}
            onChange={(e) => update("heroEyebrow", e.target.value)}
            className={input}
            placeholder="Distribution & commerce — Conakry"
          />
        </div>

        <div>
          <label className={label} htmlFor="heroTitle">
            Titre principal
          </label>
          <input
            id="heroTitle"
            value={form.heroTitle}
            onChange={(e) => update("heroTitle", e.target.value)}
            className={input}
            placeholder="Votre partenaire du quotidien"
          />
          <p className="mt-1 text-xs text-slate-400">
            Le dernier mot est mis en couleur d&apos;accent.
          </p>
        </div>

        <div>
          <label className={label} htmlFor="heroSubtitle">
            Phrase d&apos;introduction
          </label>
          <textarea
            id="heroSubtitle"
            rows={2}
            value={form.heroSubtitle}
            onChange={(e) => update("heroSubtitle", e.target.value)}
            className={input}
            placeholder="Ce que vous vendez, à qui, et pourquoi vous choisir."
          />
        </div>

        <div>
          <label className={label} htmlFor="aboutText">
            Texte de la page « À propos »
          </label>
          <textarea
            id="aboutText"
            rows={5}
            value={form.aboutText}
            onChange={(e) => update("aboutText", e.target.value)}
            className={input}
            placeholder="Votre histoire, votre métier, ce qui vous distingue."
          />
        </div>
      </div>

      {/* Arguments */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Vos arguments</h2>
            <p className="text-sm text-slate-500">
              Affichés en bas de la page d&apos;accueil.
            </p>
          </div>
          {form.highlights.length < 6 && (
            <button
              type="button"
              onClick={() =>
                update("highlights", [...form.highlights, { title: "", text: "" }])
              }
              className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>

        <div className="space-y-3">
          {form.highlights.map((highlight, index) => (
            <div
              key={index}
              className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-start"
            >
              <input
                value={highlight.title}
                onChange={(e) => updateHighlight(index, { title: e.target.value })}
                className={input}
                placeholder="Titre"
              />
              <input
                value={highlight.text}
                onChange={(e) => updateHighlight(index, { text: e.target.value })}
                className={input}
                placeholder="Une phrase d'explication"
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    "highlights",
                    form.highlights.filter((_, i) => i !== index)
                  )
                }
                className="p-2.5 text-slate-300 hover:text-red-600"
                aria-label="Retirer cet argument"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Coordonnées publiques */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Horaires d\u2019ouverture</h2>

        <div>
          <label className={label} htmlFor="openingHours">
            Horaires d&apos;ouverture
          </label>
          <input
            id="openingHours"
            value={form.openingHours}
            onChange={(e) => update("openingHours", e.target.value)}
            className={input}
            placeholder="Lun – Sam : 08h00 – 20h00"
          />
        </div>

        <p className="text-xs text-slate-400">
          Les liens vers vos réseaux sociaux ont leur propre écran :{" "}
          <Link
            href="/admin/reseaux-sociaux"
            className="text-brand-blue underline underline-offset-2"
          >
            Réseaux sociaux
          </Link>
          .
        </p>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {state.ok}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setState(await saveAppearanceAction(form));
          })
        }
        className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md text-sm"
      >
        <Save className="w-4 h-4" />
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
