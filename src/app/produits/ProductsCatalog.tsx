"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { categories, products, type Category } from "@/lib/products";

type Props = {
  initialCategory?: string;
  initialQuery?: string;
};

const allCats: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "Tout" },
  ...categories.map((c) => ({ key: c.key, label: c.label })),
];

function isCategory(v: string | undefined): v is Category | "all" {
  return v === "alimentation" || v === "entretien" || v === "electromenager" || v === "all";
}

export default function ProductsCatalog({ initialCategory, initialQuery }: Props) {
  const [category, setCategory] = useState<Category | "all">(
    isCategory(initialCategory) ? initialCategory : "all"
  );
  const [query, setQuery] = useState(initialQuery ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query]);

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
          <div className="flex flex-wrap gap-2">
            {allCats.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? "bg-brand-blue text-white border-brand-blue"
                      : "bg-white text-slate-700 border-slate-200 hover:border-brand-blue hover:text-brand-blue"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <p className="mt-8 text-sm text-slate-500 text-center">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
        </p>
      </div>
    </section>
  );
}
