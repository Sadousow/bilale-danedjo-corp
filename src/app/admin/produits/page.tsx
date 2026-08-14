import Link from "next/link";
import { Plus, Pencil, EyeOff, Eye } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { Card, PageTitle, EmptyState, Badge } from "@/components/admin/ui";
import { toggleProductAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; cat?: string; etat?: string }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { q, cat, etat } = await searchParams;

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

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: { category: { select: { label: true, key: true } } },
    }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <>
      <PageTitle
        title="Produits"
        description={`${products.length} produit(s) au catalogue`}
        action={
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-4 py-2.5 rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau produit
          </Link>
        }
      />

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher par nom ou référence…"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          <select
            name="cat"
            defaultValue={cat ?? ""}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            name="etat"
            defaultValue={etat ?? ""}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="">Tous les états</option>
            <option value="actifs">Actifs</option>
            <option value="inactifs">Inactifs</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700"
          >
            Filtrer
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <EmptyState>Aucun produit ne correspond à ces critères.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Produit</th>
                  <th className="text-left font-medium px-4 py-3">Catégorie</th>
                  <th className="text-right font-medium px-4 py-3">Prix</th>
                  <th className="text-right font-medium px-4 py-3">Marge</th>
                  <th className="text-right font-medium px-4 py-3">Stock</th>
                  <th className="text-center font-medium px-4 py-3">État</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const margin = p.cost > 0 ? ((p.price - p.cost) / p.price) * 100 : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.category.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatPrice(p.price)}
                        {p.unit && (
                          <span className="block text-xs font-normal text-slate-400">
                            / {p.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {margin === null ? "—" : `${margin.toFixed(0)} %`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            p.stock === 0
                              ? "text-red-600 font-semibold"
                              : p.stock <= p.minStock
                                ? "text-amber-600 font-semibold"
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/produits/${p.id}`}
                            className="p-2 text-slate-400 hover:text-brand-blue"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <form action={toggleProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="p-2 text-slate-400 hover:text-amber-600"
                              title={p.active ? "Désactiver" : "Activer"}
                            >
                              {p.active ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
