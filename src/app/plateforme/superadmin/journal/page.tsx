import { platformDb } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  TENANT_CREE: "Boutique créée",
  TENANT_SUSPENDU: "Boutique suspendue",
  TENANT_REACTIVE: "Boutique réactivée",
  TENANT_RESILIE: "Boutique résiliée",
  OFFRE_CHANGEE: "Offre changée",
  IMPERSONATION: "Connexion en tant que",
};

const actionStyles: Record<string, string> = {
  TENANT_CREE: "bg-emerald-50 text-emerald-700",
  TENANT_SUSPENDU: "bg-red-50 text-red-700",
  TENANT_REACTIVE: "bg-emerald-50 text-emerald-700",
  TENANT_RESILIE: "bg-slate-100 text-slate-600",
  OFFRE_CHANGEE: "bg-blue-50 text-blue-700",
  IMPERSONATION: "bg-amber-50 text-amber-700",
};

export default async function AuditPage() {
  await requirePlatformUser();

  const entries = await platformDb.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-slate-800">Journal</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Actions sensibles de la console. Ce journal n&apos;est jamais purgé
        automatiquement.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {entries.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">
            Aucune action enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Action</th>
                  <th className="text-left font-medium px-4 py-3">Boutique</th>
                  <th className="text-left font-medium px-4 py-3">Auteur</th>
                  <th className="text-left font-medium px-4 py-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionStyles[entry.action] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {actionLabels[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {entry.tenantName || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.actorName || "Inscription publique"}
                      {entry.ip && (
                        <span className="block text-xs text-slate-400">
                          {entry.ip}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {entry.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
