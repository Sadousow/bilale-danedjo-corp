import { AlertTriangle } from "lucide-react";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatDateTime, movementTypeLabels } from "@/lib/format";
import { Card, PageTitle, EmptyState, Badge } from "@/components/admin/ui";
import StockForm from "./StockForm";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const prisma = await db();
  await requireRole("GERANT");
  const tenantId = await currentTenantId();

  const [products, movements, lowStock] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, stock: true, unit: true },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.$queryRaw<{ id: string; name: string; stock: number; minStock: number }[]>`
      SELECT id, name, stock, "minStock"
      FROM "Product"
      WHERE "tenantId" = ${tenantId} AND active = true AND stock <= "minStock"
      ORDER BY stock ASC
    `,
  ]);

  return (
    <>
      <PageTitle
        title="Stock"
        description="Entrées, sorties et inventaire"
      />

      {lowStock.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900">
              {lowStock.length} produit(s) à réapprovisionner
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1 text-xs"
              >
                <span className="text-slate-700">{p.name}</span>
                <span
                  className={
                    p.stock === 0
                      ? "font-semibold text-red-600"
                      : "font-semibold text-amber-700"
                  }
                >
                  {p.stock === 0 ? "rupture" : `${p.stock} / ${p.minStock}`}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 p-5 sm:p-6 h-fit">
          <h2 className="font-semibold text-slate-800 mb-4">Nouveau mouvement</h2>
          <StockForm products={products} />
        </Card>

        <Card className="lg:col-span-3 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Historique des mouvements</h2>
          </div>
          {movements.length === 0 ? (
            <EmptyState>Aucun mouvement de stock enregistré.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Date</th>
                    <th className="text-left font-medium px-4 py-2.5">Produit</th>
                    <th className="text-left font-medium px-4 py-2.5">Type</th>
                    <th className="text-right font-medium px-4 py-2.5">Qté</th>
                    <th className="text-right font-medium px-4 py-2.5">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                        {m.user && (
                          <span className="block text-xs text-slate-400">
                            {m.user.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {m.product.name}
                        {m.reason && (
                          <span className="block text-xs text-slate-400">
                            {m.reason}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            m.type === "ENTREE"
                              ? "green"
                              : m.type === "VENTE"
                                ? "blue"
                                : m.type === "SORTIE"
                                  ? "red"
                                  : "slate"
                          }
                        >
                          {movementTypeLabels[m.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {m.type === "ENTREE" || m.type === "RETOUR" ? "+" : "−"}
                        {m.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {m.before} → <span className="font-semibold text-slate-800">{m.after}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
