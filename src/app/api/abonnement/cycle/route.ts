import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { runBillingCycle } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Passe quotidien de facturation, à déclencher par une tâche planifiée.
 *
 * Sur Vercel, ajouter dans `vercel.json` :
 *   { "crons": [{ "path": "/api/abonnement/cycle", "schedule": "0 6 * * *" }] }
 *
 * Vercel signe ses appels avec `CRON_SECRET` ; on refuse tout appel non
 * authentifié pour qu'un tiers ne puisse pas déclencher la facturation.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET absent : passe refusé." },
      { status: 503 }
    );
  }

  const report = await runBillingCycle();

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    ...report,
  });
}
