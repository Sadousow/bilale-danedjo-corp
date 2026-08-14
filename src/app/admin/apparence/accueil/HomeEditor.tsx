"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

import ImageUploader from "@/components/admin/ImageUploader";
import { Card } from "@/components/admin/ui";
import PreviewPanel from "./PreviewPanel";
import {
  blockDescriptions,
  blockLabels,
  newBlock,
  productSourceLabels,
  themePresets,
  toneLabels,
  REPEATABLE,
  type Block,
  type BlockProps,
  type BlockType,
  type ProductSource,
  type ThemePreset,
} from "@/lib/blocks";
import {
  saveDraftAction,
  publishHomeAction,
  discardDraftAction,
  resetHomeAction,
  type HomeState,
} from "./actions";

const input =
  "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-xs font-medium text-slate-600 mb-1";

const ALL_TYPES: BlockType[] = [
  "hero",
  "categories",
  "produits",
  "arguments",
  "texte",
  "image",
  "appel",
];

export default function HomeEditor({
  initialBlocks,
  initialPreset,
  publishedBlocks,
  publishedPreset,
  shopUrl,
}: {
  initialBlocks: Block[];
  initialPreset: ThemePreset;
  /** Ce que voient les visiteurs — sert à détecter les changements en attente. */
  publishedBlocks: Block[];
  publishedPreset: ThemePreset;
  shopUrl: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [preset, setPreset] = useState<ThemePreset>(initialPreset);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [state, setState] = useState<HomeState>({});
  const [pending, startTransition] = useTransition();

  // Incrémenté après chaque brouillon enregistré : c'est le signal de
  // rechargement du cadre d'aperçu.
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const published = JSON.stringify({ blocks: publishedBlocks, preset: publishedPreset });
  const current = JSON.stringify({ blocks, preset });
  const unpublished = current !== published;

  /*
   * L'aperçu montre la vraie page, donc le brouillon doit être en base avant
   * de recharger le cadre. On attend une pause dans la saisie : enregistrer à
   * chaque caractère produirait une requête par frappe.
   */
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setSyncing(true);
    const timer = setTimeout(async () => {
      try {
        await saveDraftAction({ themePreset: preset, blocks });
        setVersion((v) => v + 1);
      } catch {
        // Réseau coupé ou serveur indisponible : seul l'aperçu en pâtit.
        // Ce que le marchand a saisi reste à l'écran, et « Publier » le
        // signalera clairement si le problème persiste.
        setDraftFailed(true);
      }
      setSyncing(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [current, blocks, preset]);

  function update(id: string, patch: Partial<Block>) {
    setBlocks((list) =>
      list.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
    setState({});
  }

  function updateProps(id: string, patch: Partial<BlockProps>) {
    setBlocks((list) =>
      list.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b))
    );
    setState({});
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    setState({});
  }

  function remove(id: string) {
    setBlocks((list) => list.filter((b) => b.id !== id));
    setState({});
  }

  function add(type: BlockType) {
    const block = newBlock(type);
    setBlocks((list) => [...list, block]);
    setOpenId(block.id);
    setAdding(false);
    setState({});
  }

  function publish() {
    startTransition(async () => {
      setState(await publishHomeAction({ themePreset: preset, blocks }));
      // Recharge pour que « publié » et « brouillon » repartent égaux.
      window.location.reload();
    });
  }

  function discard() {
    if (!confirm("Abandonner vos modifications et revenir à la page publiée ?")) {
      return;
    }
    startTransition(async () => {
      const result = await discardDraftAction();
      setState(result);
      if (result.ok) window.location.reload();
    });
  }

  function reset() {
    if (
      !confirm(
        "Rétablir la composition d'origine ? Vos textes de sections seront perdus. Rien ne sera publié tant que vous n'aurez pas cliqué sur Publier."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await resetHomeAction();
      setState(result);
      // Le serveur fait foi : on recharge plutôt que de deviner l'état.
      if (result.ok) window.location.reload();
    });
  }

  // Un bloc unique déjà présent ne doit pas être proposé une deuxième fois.
  const used = new Set(blocks.map((b) => b.type));
  const available = ALL_TYPES.filter(
    (type) => REPEATABLE.includes(type) || !used.has(type)
  );

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,620px)] xl:gap-6 xl:items-start">
      <div className="space-y-6 max-w-3xl">
      {draftFailed && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          L&apos;aperçu ne peut pas être mis à jour pour le moment. Vos
          modifications sont toujours à l&apos;écran.
        </p>
      )}

      {unpublished && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 mr-auto">
            Modifications non publiées. Vos visiteurs voient encore la page
            précédente.
          </p>
          <button
            type="button"
            onClick={discard}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-950 disabled:opacity-60"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Abandonner
          </button>
        </div>
      )}

      <Card className="p-5">
        <h2 className="font-semibold text-slate-800">Style visuel</h2>
        <p className="mt-1 text-sm text-slate-500">
          Le style agit sur les arrondis, les ombres et l&apos;espacement. Vos
          couleurs et vos textes ne changent pas.
        </p>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {(Object.keys(themePresets) as ThemePreset[]).map((key) => {
            const item = themePresets[key];
            const active = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPreset(key);
                  setState({});
                }}
                className={`text-left p-4 border transition-colors ${
                  active
                    ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                style={{ borderRadius: item.radius }}
              >
                <span className="block font-semibold text-sm text-brand-blue">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Sections</h2>
            <p className="mt-1 text-sm text-slate-500">
              Réordonnez, masquez ou modifiez les sections de votre page
              d&apos;accueil.
            </p>
          </div>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-blue hover:text-brand-gold shrink-0"
          >
            Voir la boutique
          </a>
        </div>

        <div className="mt-5 space-y-3">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={`border rounded-lg ${
                block.visible ? "border-slate-200" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Monter la section"
                    className="p-0.5 text-slate-400 hover:text-brand-blue disabled:opacity-25 disabled:hover:text-slate-400"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label="Descendre la section"
                    className="p-0.5 text-slate-400 hover:text-brand-blue disabled:opacity-25 disabled:hover:text-slate-400"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenId(openId === block.id ? null : block.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <span
                    className={`block text-sm font-medium truncate ${
                      block.visible ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {blockLabels[block.type]}
                  </span>
                  <span className="block text-xs text-slate-400 truncate">
                    {block.props.title || blockDescriptions[block.type]}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => update(block.id, { visible: !block.visible })}
                  aria-label={block.visible ? "Masquer la section" : "Afficher la section"}
                  title={block.visible ? "Masquer" : "Afficher"}
                  className="p-1.5 text-slate-400 hover:text-brand-blue"
                >
                  {block.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => remove(block.id)}
                  aria-label="Supprimer la section"
                  title="Supprimer"
                  className="p-1.5 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {openId === block.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/70">
                  <BlockFields
                    block={block}
                    onChange={(patch) => updateProps(block.id, patch)}
                  />
                </div>
              )}
            </div>
          ))}

          {blocks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              Aucune section. Ajoutez-en une ci-dessous.
            </p>
          )}
        </div>

        <div className="mt-4">
          {adding ? (
            <div className="border border-slate-200 rounded-lg p-3 space-y-1">
              {available.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => add(type)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50"
                >
                  <span className="block text-sm font-medium text-slate-800">
                    {blockLabels[type]}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {blockDescriptions[type]}
                  </span>
                </button>
              ))}
              {available.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">
                  Toutes les sections uniques sont déjà utilisées.
                </p>
              )}
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="w-full text-center px-3 py-2 text-sm text-slate-500 hover:text-slate-800"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-brand-gold"
            >
              <Plus className="w-4 h-4" />
              Ajouter une section
            </button>
          )}
        </div>
      </Card>

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {state.ok}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pb-20 xl:pb-0">
        <button
          type="button"
          onClick={publish}
          disabled={pending || !unpublished}
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
        >
          <Save className="w-4 h-4" />
          {pending
            ? "Publication…"
            : unpublished
              ? "Publier les modifications"
              : "Tout est publié"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-60"
        >
          <RotateCcw className="w-4 h-4" />
          Rétablir l&apos;original
        </button>
      </div>
      </div>

      {/* Grand écran : l'aperçu accompagne l'édition, sans clic. */}
      <div className="hidden xl:block sticky top-6 h-[calc(100vh-7rem)]">
        <PreviewPanel shopUrl={shopUrl} version={version} pending={syncing} />
      </div>

      {/* Sous xl, la place manque : l'aperçu s'ouvre en plein écran. */}
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="xl:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 bg-brand-blue text-white font-semibold px-5 py-3 rounded-full shadow-lg"
      >
        <Eye className="w-4 h-4" />
        Aperçu
      </button>

      {showPreview && (
        <div className="xl:hidden">
          <PreviewPanel
            shopUrl={shopUrl}
            version={version}
            pending={syncing}
            fullscreen
            onClose={() => setShowPreview(false)}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------ champs par section

function BlockFields({
  block,
  onChange,
}: {
  block: Block;
  onChange: (patch: Partial<BlockProps>) => void;
}) {
  const p = block.props;

  if (block.type === "hero") {
    return (
      <p className="text-sm text-slate-600">
        Le titre, la phrase d&apos;introduction et la photo de couverture se
        règlent dans{" "}
        <Link href="/admin/apparence" className="text-brand-blue underline">
          Apparence
        </Link>
        . Ici, vous choisissez seulement sa place dans la page.
      </p>
    );
  }

  if (block.type === "arguments") {
    return (
      <div className="space-y-3">
        <Titles p={p} onChange={onChange} />
        <ToneField p={p} onChange={onChange} />
        <p className="text-xs text-slate-500">
          Le contenu des encarts se modifie dans{" "}
          <Link href="/admin/apparence" className="text-brand-blue underline">
            Apparence → Vos arguments
          </Link>
          .
        </p>
      </div>
    );
  }

  if (block.type === "produits") {
    return (
      <div className="space-y-3">
        <Titles p={p} onChange={onChange} />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Produits affichés</label>
            <select
              value={p.source ?? "populaires"}
              onChange={(e) => onChange({ source: e.target.value as ProductSource })}
              className={input}
            >
              {(Object.keys(productSourceLabels) as ProductSource[]).map((key) => (
                <option key={key} value={key}>
                  {productSourceLabels[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Nombre maximum</label>
            <input
              type="number"
              min={1}
              max={24}
              value={p.limit ?? 8}
              onChange={(e) => onChange({ limit: Number(e.target.value) })}
              className={input}
            />
          </div>
        </div>
        <ToneField p={p} onChange={onChange} />
        <p className="text-xs text-slate-500">
          Un produit apparaît comme « populaire » ou « en promotion » selon sa
          fiche produit. Sans produit correspondant, la section ne s&apos;affiche
          pas.
        </p>
      </div>
    );
  }

  if (block.type === "categories") {
    return (
      <div className="space-y-3">
        <Titles p={p} onChange={onChange} withDescription />
        <ToneField p={p} onChange={onChange} />
      </div>
    );
  }

  if (block.type === "texte") {
    return (
      <div className="space-y-3">
        <Titles p={p} onChange={onChange} />
        <div>
          <label className={label}>Texte</label>
          <textarea
            rows={6}
            value={p.body ?? ""}
            onChange={(e) => onChange({ body: e.target.value })}
            className={input}
            placeholder="Écrivez librement. Laissez une ligne vide pour séparer deux paragraphes."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Texte du bouton (facultatif)</label>
            <input
              value={p.buttonLabel ?? ""}
              onChange={(e) => onChange({ buttonLabel: e.target.value })}
              className={input}
              placeholder="En savoir plus"
            />
          </div>
          <div>
            <label className={label}>Lien du bouton</label>
            <input
              value={p.buttonHref ?? ""}
              onChange={(e) => onChange({ buttonHref: e.target.value })}
              className={input}
              placeholder="/produits"
            />
            <p className="mt-1 text-xs text-slate-400">
              Une page de votre site (/produits) ou une adresse https://
            </p>
          </div>
        </div>
        <ToneField p={p} onChange={onChange} />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="space-y-3">
        <ImageUploader
          kind="banniere"
          value={p.imageUrl ?? ""}
          onChange={(url) => onChange({ imageUrl: url })}
          label="Image de la section"
          hint="Format large conseillé : environ 1600 × 550 px."
        />
        <div>
          <label className={label}>Texte par-dessus (facultatif)</label>
          <input
            value={p.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            className={input}
            placeholder="Livraison partout à Conakry"
          />
          <p className="mt-1 text-xs text-slate-400">
            Un voile sombre est ajouté automatiquement pour garder le texte
            lisible.
          </p>
        </div>
      </div>
    );
  }

  // appel
  return (
    <div className="space-y-3">
      <div>
        <label className={label}>Titre</label>
        <input
          value={p.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className={input}
        />
      </div>
      <div>
        <label className={label}>Phrase d&apos;accompagnement</label>
        <textarea
          rows={2}
          value={p.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          className={input}
        />
      </div>
      <div>
        <label className={label}>Texte du bouton</label>
        <input
          value={p.buttonLabel ?? ""}
          onChange={(e) => onChange({ buttonLabel: e.target.value })}
          className={input}
          placeholder="Commander sur WhatsApp"
        />
      </div>
      <ToneField p={p} onChange={onChange} />
    </div>
  );
}

function Titles({
  p,
  onChange,
  withDescription = false,
}: {
  p: BlockProps;
  onChange: (patch: Partial<BlockProps>) => void;
  withDescription?: boolean;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Mention du dessus</label>
          <input
            value={p.eyebrow ?? ""}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            className={input}
            placeholder="Nos meilleures ventes"
          />
        </div>
        <div>
          <label className={label}>Titre</label>
          <input
            value={p.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            className={input}
          />
        </div>
      </div>
      {withDescription && (
        <div>
          <label className={label}>Phrase d&apos;introduction</label>
          <textarea
            rows={2}
            value={p.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            className={input}
          />
        </div>
      )}
    </>
  );
}

function ToneField({
  p,
  onChange,
}: {
  p: BlockProps;
  onChange: (patch: Partial<BlockProps>) => void;
}) {
  return (
    <div>
      <label className={label}>Fond de la section</label>
      <select
        value={p.tone ?? "clair"}
        onChange={(e) => onChange({ tone: e.target.value as BlockProps["tone"] })}
        className={input}
      >
        {(Object.keys(toneLabels) as NonNullable<BlockProps["tone"]>[]).map((key) => (
          <option key={key} value={key}>
            {toneLabels[key]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-400">
        Alterner les fonds aide à distinguer les sections.
      </p>
    </div>
  );
}
