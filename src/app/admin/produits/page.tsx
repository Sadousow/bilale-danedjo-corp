import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { etatMeta, estSelectionnable, type EtatMetaCle } from "@/lib/meta-catalog";
import { messageAction } from "@/lib/messages-meta";
import { Card, PageTitle, EmptyState, Badge } from "@/components/admin/ui";
import { toggleProductAction } from "./actions";
import {
  basculerMetaAction,
  depublierLotAction,
  publierLotAction,
} from "./meta-actions";
import ToutSelectionner from "./ToutSelectionner";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    etat?: string;
    meta?: string;
    ok?: string;
  }>;
};

/** Couleur du badge Meta. Un seul endroit, pour que les états restent lisibles. */
const TONS: Record<EtatMetaCle, "green" | "red" | "slate" | "blue"> = {
  publie: "green",
  bloque: "red",
  rejete: "red",
  publiable: "slate",
  impossible: "slate",
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const params = await searchParams;
  const { q, cat, etat, meta, ok } = params;

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  if (cat) where.category = { key: cat };
  if (etat === "inactifs") where.active = false;
  if (etat === "actifs") where.active = true;

  const [tous, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: { select: { label: true, key: true } },
        metaCatalogItem: true,
      },
    }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  /*
   * Le filtre Meta s'applique en mémoire, pas en SQL.
   *
   * « Non publiable » est le résultat d'`eligibility()`, qui croise six
   * conditions dont le seuil de taille d'image. Le réécrire en clause `where`
   * dupliquerait la règle : deux versions qui divergeraient au premier
   * changement de spécification Meta. Un catalogue tient en quelques centaines
   * de lignes et la page est déjà en rendu dynamique — le coût est nul.
   */
  const enrichis = tous.map((p) => ({
    ...p,
    meta: etatMeta(p, p.metaCatalogItem),
    selectionnable: estSelectionnable(p, p.metaCatalogItem),
  }));

  const products = enrichis.filter((p) => {
    if (meta === "publies") return p.metaCatalogItem?.published === true;
    if (meta === "non-publies")
      return p.metaCatalogItem?.published !== true && p.selectionnable;
    if (meta === "non-publiables") return p.meta.cle === "impossible";
    if (meta === "alertes") return p.meta.alerte;
    return true;
  });

  const totalPublies = enrichis.filter(
    (p) => p.metaCatalogItem?.published === true
  ).length;
  const totalAlertes = enrichis.filter((p) => p.meta.alerte).length;
  const selectionnables = products.filter((p) => p.selectionnable).length;

  const message = messageAction(ok);

  /*
   * Les filtres courants sont renvoyés à l'action, qui les remet dans l'URL de
   * retour. Sans cela, publier depuis « Non publiés » renvoyait sur la liste
   * complète : filtre perdu à chaque lot.
   */
  const filtresCourants = new URLSearchParams(
    Object.entries({ q, cat, etat, meta }).filter(([, v]) => v) as [string, string][]
  ).toString();

  const champ =
    "px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

  return (
    <>
      <PageTitle
        title="Produits"
        description={`${enrichis.length} produit(s) · ${totalPublies} marqué(s) pour Meta`}
        action={
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-light"
          >
            <Plus className="h-4 w-4" />
            Nouveau produit
          </Link>
        }
      />

      {message && (
        <p
          className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            message.ton === "succes"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {message.ton === "succes" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message.texte}
        </p>
      )}

      {/*
        Un seul rappel, en tête, plutôt qu'une phrase répétée sous chaque ligne.
        Les articles concernés demandent une action du marchand ; les autres
        états sont normaux et n'ont pas à occuper la place.
      */}
      {totalAlertes > 0 && meta !== "alertes" && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {totalAlertes} article(s) marqué(s) pour Meta demandent votre
          attention.
          <Link
            href="/admin/produits?meta=alertes"
            className="font-medium underline underline-offset-2"
          >
            Les voir
          </Link>
        </p>
      )}

      <Card className="mb-6 p-4">
        <form className="flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher par nom ou référence…"
            className={`flex-1 ${champ}`}
          />
          <select name="cat" defaultValue={cat ?? ""} className={champ}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select name="etat" defaultValue={etat ?? ""} className={champ}>
            <option value="">Tous les états</option>
            <option value="actifs">Actifs</option>
            <option value="inactifs">Inactifs</option>
          </select>
          <select name="meta" defaultValue={meta ?? ""} className={champ}>
            <option value="">Meta : tous</option>
            <option value="publies">Marqués pour Meta</option>
            <option value="non-publies">Publiables, non marqués</option>
            <option value="non-publiables">Non publiables</option>
            <option value="alertes">À corriger</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Filtrer
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <EmptyState>Aucun produit ne correspond à ces critères.</EmptyState>
        ) : (
          /*
            Un seul formulaire pour toute la table : un formulaire par ligne
            serait imbriqué dans celui du lot, ce qui est interdit en HTML.

            ⚠️ Les boutons de ligne passent donc leur identifiant par
            `.bind(null, p.id)`, jamais par `name="id"`. Vérifié à l'exécution :
            React 19 ne transmet pas le `name`/`value` du bouton de soumission
            à une Server Action déclenchée par `formAction`. Le `FormData` reçu
            ne contient que les cases cochées ; `formData.get("id")` y vaut
            `null` et l'action sort en silence.
          */
          <form>
            <input type="hidden" name="retour" value={filtresCourants} />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <ToutSelectionner total={selectionnables} />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Produit</th>
                    <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                    <th className="px-4 py-3 text-right font-medium">Prix</th>
                    <th className="px-4 py-3 text-right font-medium">Marge</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    <th className="px-4 py-3 text-center font-medium">État</th>
                    <th className="px-4 py-3 text-center font-medium">Meta</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const marge =
                      p.cost > 0 ? ((p.price - p.cost) / p.price) * 100 : null;
                    const publie = p.metaCatalogItem?.published === true;

                    return (
                      <tr
                        key={p.id}
                        className={p.meta.alerte ? "bg-red-50/40" : "hover:bg-slate-50"}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            name="ids"
                            value={p.id}
                            disabled={!p.selectionnable}
                            aria-label={`Sélectionner ${p.name}`}
                            className="h-4 w-4 rounded border-slate-300 accent-brand-blue disabled:opacity-30"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.category.label}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatPrice(p.price)}
                          {p.unit && (
                            <span className="block text-xs font-normal text-slate-400">
                              / {p.unit}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {marge === null ? "—" : `${marge.toFixed(0)} %`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              p.stock === 0
                                ? "font-semibold text-red-600"
                                : p.stock <= p.minStock
                                  ? "font-semibold text-amber-600"
                                  : "text-slate-700"
                            }
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.active ? (
                            <Badge tone="green">Actif</Badge>
                          ) : (
                            <Badge tone="slate">Inactif</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {/*
                            Le motif est en infobulle, pas en paragraphe sous
                            chaque ligne : répété sur 200 articles, il rendait
                            la table illisible. Seules les alertes gardent une
                            phrase visible — ce sont les seules à traiter.
                          */}
                          <span title={p.meta.detail ?? undefined}>
                            <Badge tone={TONS[p.meta.cle]}>{p.meta.texte}</Badge>
                          </span>
                          {p.meta.alerte && p.meta.detail && (
                            <p className="mx-auto mt-1 max-w-48 text-xs text-red-600">
                              {p.meta.detail}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/produits/${p.id}`}
                              className="p-2 text-slate-400 hover:text-brand-blue"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="submit"
                              formAction={basculerMetaAction.bind(null, p.id)}
                              disabled={!p.selectionnable}
                              className="p-2 text-slate-400 hover:text-brand-blue disabled:opacity-25 disabled:hover:text-slate-400"
                              title={
                                publie
                                  ? "Retirer de la sélection Meta"
                                  : p.selectionnable
                                    ? "Marquer pour Meta"
                                    : (p.meta.detail ?? "Non publiable")
                              }
                            >
                              {publie ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="submit"
                              formAction={toggleProductAction.bind(null, p.id)}
                              className="p-2 text-slate-400 hover:text-amber-600"
                              title={p.active ? "Désactiver" : "Activer"}
                            >
                              {p.active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs text-slate-500">Avec la sélection :</span>
              <button
                type="submit"
                formAction={publierLotAction}
                className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue-light"
              >
                <Share2 className="h-4 w-4" />
                Marquer pour Meta
              </button>
              <button
                type="submit"
                formAction={depublierLotAction}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Ban className="h-4 w-4" />
                Retirer de Meta
              </button>
              <Link
                href="/admin/reseaux-sociaux"
                className="ml-auto text-xs text-slate-500 underline underline-offset-2 hover:text-brand-blue"
              >
                Réseaux sociaux et catalogue Meta
              </Link>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
