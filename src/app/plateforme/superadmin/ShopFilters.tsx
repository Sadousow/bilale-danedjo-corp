"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { filterLabels, type ShopFilter } from "@/lib/console-filters";

const ORDER: ShopFilter[] = [
  "tout",
  "a-relancer",
  "essai",
  "actif",
  "impaye",
  "suspendu",
  "jamais-publiee",
];

/**
 * Recherche et filtres, écrits dans l'URL.
 *
 * L'état vit dans les paramètres d'adresse plutôt que dans le composant :
 * une recherche se partage par copier-coller, se met en favori, et survit à
 * un rechargement après une suspension.
 */
export default function ShopFilters({
  counts,
}: {
  counts: Partial<Record<ShopFilter, number>>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = (params.get("filtre") ?? "tout") as ShopFilter;
  const [query, setQuery] = useState(params.get("q") ?? "");

  // Frappe au clavier : on attend une respiration avant de naviguer, sinon
  // chaque lettre déclenche un rendu serveur.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      startTransition(() => router.replace(`/superadmin?${next}`));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, params, router]);

  function select(filter: ShopFilter) {
    const next = new URLSearchParams(params.toString());
    if (filter === "tout") next.delete("filtre");
    else next.set("filtre", filter);
    startTransition(() => router.replace(`/superadmin?${next}`));
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {/* `type="text"` et non `search` : Chrome ajoute sa propre croix
            d'effacement, qui doublonnait avec la nôtre. */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, adresse, téléphone…"
          aria-label="Rechercher une boutique"
          className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}
        role="group"
        aria-label="Filtrer par statut"
      >
        {ORDER.map((filter) => {
          const count = counts[filter];
          const selected = active === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => select(filter)}
              aria-pressed={selected}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? "bg-brand-blue text-white border-brand-blue"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {filterLabels[filter]}
              {count !== undefined && count > 0 && (
                <span className={selected ? "ml-1.5 text-white/70" : "ml-1.5 text-slate-400"}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
