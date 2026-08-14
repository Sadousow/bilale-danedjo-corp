import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { requirePlatformUser } from "@/lib/platform-auth";
import { getPlatformStats } from "@/lib/platform-stats";
import { countByFilter, filterShops, parseFilter } from "@/lib/console-filters";
import { listShops } from "@/lib/platform-shops";
import NewTenantForm from "./NewTenantForm";
import ShopFilters from "./ShopFilters";
import ShopTable from "./ShopTable";
import StatsBoard from "./StatsBoard";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ filtre?: string; q?: string }>;
};

export default async function ConsoleHome({ searchParams }: Props) {
  await requirePlatformUser();

  const { filtre, q } = await searchParams;
  const filter = parseFilter(filtre);

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = root.startsWith("localhost") ? "http" : "https";

  const [stats, shops] = await Promise.all([getPlatformStats(), listShops()]);
  const visible = filterShops(shops, { q, filter });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Console
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.totalShops} boutique{stats.totalShops > 1 ? "s" : ""} —{" "}
            {stats.signupsThisMonth} inscription
            {stats.signupsThisMonth > 1 ? "s" : ""} ce mois-ci
          </p>
        </div>
        <a
          href="#nouvelle"
          className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Nouvelle boutique
        </a>
      </div>

      <StatsBoard stats={stats} />

      {/* useSearchParams impose une frontière de Suspense au prérendu. */}
      <Suspense fallback={<div className="h-12 mb-4" />}>
        <ShopFilters counts={countByFilter(shops)} />
      </Suspense>

      <ShopTable
        shops={visible}
        protocol={protocol}
        root={root}
        query={q?.trim() ?? ""}
        filter={filter}
      />

      {visible.length > 0 && visible.length !== shops.length && (
        <p className="mt-3 text-xs text-slate-400">
          {visible.length} boutique{visible.length > 1 ? "s" : ""} sur{" "}
          {shops.length}.
        </p>
      )}

      <div
        id="nouvelle"
        className="mt-10 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 max-w-2xl scroll-mt-6"
      >
        <h2 className="font-semibold text-slate-800 mb-1">Nouvelle boutique</h2>
        <p className="text-sm text-slate-500 mb-5">
          Création directe, sans passer par l&apos;inscription en ligne. La
          boutique est active immédiatement.
        </p>
        <NewTenantForm rootDomain={root} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Chaque connexion en tant que marchand est inscrite au{" "}
        <Link href="/superadmin/journal" className="underline">
          journal
        </Link>
        .
      </p>
    </>
  );
}
