import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/tenant-db";
import { PLATEFORMES, type SocialKey } from "@/lib/reseaux-sociaux";
import { Card, PageTitle } from "@/components/admin/ui";
import SocialForm from "./SocialForm";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  await requireRole("ADMIN");

  const prisma = await db();
  const [settings, marquesPourMeta] = await Promise.all([
    getSettings(),
    prisma.metaCatalogItem.count({ where: { published: true } }),
  ]);

  const valeursInitiales = Object.fromEntries(
    PLATEFORMES.map((p) => [p.key, settings[p.champ] ?? ""])
  ) as Record<SocialKey, string>;

  return (
    <>
      <PageTitle
        title="Réseaux sociaux"
        description="Les liens affichés en pied de page de votre boutique"
      />

      <SocialForm valeursInitiales={valeursInitiales} />

      {/*
        État du catalogue Meta.
        Volontairement en lecture seule, et volontairement explicite sur ce qui
        n'existe pas encore : un bouton « connecter » qui ne connecte rien vaut
        moins qu'une phrase honnête. La connexion viendra ici.
      */}
      <Card className="mt-8 max-w-2xl p-5">
        <h2 className="font-semibold text-slate-800">Catalogue Meta</h2>
        <p className="mt-2 text-sm text-slate-600">
          {marquesPourMeta === 0 ? (
            <>
              Aucun article n&apos;est marqué pour Meta. Vous pouvez en
              sélectionner depuis{" "}
              <Link
                href="/admin/produits"
                className="text-brand-blue underline underline-offset-2"
              >
                vos produits
              </Link>
              .
            </>
          ) : (
            <>
              <strong>{marquesPourMeta}</strong> article(s) marqué(s) pour
              publication.{" "}
              <Link
                href="/admin/produits?meta=publies"
                className="text-brand-blue underline underline-offset-2"
              >
                Voir la sélection
              </Link>
              .
            </>
          )}
        </p>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          La connexion à Meta Business n&apos;est pas encore disponible : ces
          articles sont enregistrés chez vous, <strong>rien n&apos;est
          envoyé à Meta</strong> pour l&apos;instant.
        </p>
      </Card>
    </>
  );
}
