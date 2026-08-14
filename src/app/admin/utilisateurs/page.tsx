import { Power } from "lucide-react";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatDate, roleLabels } from "@/lib/format";
import { Card, PageTitle, Badge } from "@/components/admin/ui";
import { CreateUserForm, ResetPasswordForm, RoleSelect } from "./UserForms";
import { toggleUserAction, changeRoleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const prisma = await db();
  const session = await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { sales: true } } },
  });

  return (
    <>
      <PageTitle
        title="Utilisateurs"
        description="Comptes du personnel, rôles et accès"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">
              {users.length} compte(s)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Utilisateur</th>
                  <th className="text-left font-medium px-4 py-3">Rôle</th>
                  <th className="text-right font-medium px-4 py-3">Ventes</th>
                  <th className="text-center font-medium px-4 py-3">État</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === session.sub;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              (vous)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-400">
                          Créé le {formatDate(u.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <Badge tone="blue">{roleLabels[u.role]}</Badge>
                        ) : (
                          <form action={changeRoleAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <RoleSelect defaultValue={u.role} />
                          </form>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {u._count.sales}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.active ? (
                          <Badge tone="green">Actif</Badge>
                        ) : (
                          <Badge tone="red">Désactivé</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <form action={toggleUserAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="p-2 text-slate-400 hover:text-red-600"
                              title={u.active ? "Désactiver" : "Réactiver"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Nouveau compte</h2>
            <CreateUserForm />
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Réinitialiser un mot de passe
            </h2>
            <ResetPasswordForm
              users={users.map((u) => ({ id: u.id, name: u.name }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
