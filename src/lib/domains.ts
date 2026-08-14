import "server-only";

import { resolveTxt } from "node:dns/promises";
import { randomBytes } from "node:crypto";

/**
 * Domaines personnalisés.
 *
 * Deux opérations indépendantes :
 *   1. **vérification de propriété** — on demande au marchand de publier un
 *      enregistrement TXT que nous seuls connaissons
 *   2. **rattachement à l'hébergeur** — sur Vercel, le domaine doit être
 *      déclaré sur le projet pour que le certificat TLS soit émis
 *
 * La seconde n'est tentée que si `VERCEL_TOKEN` et `VERCEL_PROJECT_ID` sont
 * fournis ; sinon on affiche la marche à suivre manuelle.
 */

const TXT_PREFIX = "bdc-verification";

export function newVerificationToken(): string {
  return randomBytes(16).toString("hex");
}

export function txtRecordName(host: string): string {
  return `_${TXT_PREFIX}.${host}`;
}

export function txtRecordValue(token: string): string {
  return `${TXT_PREFIX}=${token}`;
}

/** Nettoie une saisie utilisateur en nom d'hôte exploitable. */
export function normalizeHost(raw: string): string | null {
  const value = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

  if (!value) return null;
  // Un point au minimum, pas d'espace, pas de caractère exotique.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return null;
  if (value.includes("..") || value.startsWith("-")) return null;

  return value;
}

export type VerificationResult =
  | { ok: true }
  | { ok: false; error: string; found?: string[] };

/** Cherche l'enregistrement TXT attendu dans le DNS public. */
export async function verifyDomainOwnership(
  host: string,
  token: string
): Promise<VerificationResult> {
  const name = txtRecordName(host);
  const expected = txtRecordValue(token);

  try {
    const records = await resolveTxt(name);
    const flat = records.map((chunks) => chunks.join("").trim());

    if (flat.some((value) => value === expected || value === token)) {
      return { ok: true };
    }

    return {
      ok: false,
      error:
        flat.length === 0
          ? "Aucun enregistrement TXT trouvé. La propagation DNS peut prendre jusqu'à une heure."
          : "L'enregistrement TXT trouvé ne correspond pas à la valeur attendue.",
      found: flat,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return {
        ok: false,
        error:
          "Enregistrement TXT introuvable. Vérifiez qu'il est bien publié, puis réessayez dans quelques minutes.",
      };
    }
    return { ok: false, error: "La vérification DNS a échoué. Réessayez." };
  }
}

// ------------------------------------------------------------- Vercel

export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

/**
 * Déclare le domaine sur le projet Vercel, ce qui déclenche l'émission du
 * certificat. Sans jeton configuré, on renvoie une instruction manuelle
 * plutôt qu'une erreur : le marchand n'y peut rien.
 */
export async function attachDomainToVercel(
  host: string
): Promise<{ ok: boolean; message: string }> {
  if (!isVercelConfigured()) {
    return {
      ok: false,
      message:
        "Ajoutez ce domaine au projet Vercel depuis le tableau de bord (Settings → Domains).",
    };
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(
    `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`
  );
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: host }),
      cache: "no-store",
    });

    if (response.ok) {
      return { ok: true, message: "Domaine rattaché à l'hébergement." };
    }

    const body: unknown = await response.json().catch(() => null);
    const code = (body as { error?: { code?: string } })?.error?.code;

    if (code === "domain_already_in_use" || response.status === 409) {
      return { ok: true, message: "Domaine déjà rattaché à l'hébergement." };
    }

    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Vercel a refusé la demande (code ${response.status}).`;
    return { ok: false, message };
  } catch {
    return {
      ok: false,
      message: "Impossible de joindre l'API Vercel. Réessayez plus tard.",
    };
  }
}

/** Enregistrements DNS à communiquer au marchand. */
export function dnsInstructions(host: string, token: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "example.com";
  const isApex = host.split(".").length === 2;

  return {
    verification: {
      type: "TXT",
      name: `_${TXT_PREFIX}`,
      value: txtRecordValue(token),
    },
    routing: isApex
      ? { type: "A", name: "@", value: "76.76.21.21" }
      : { type: "CNAME", name: host.split(".")[0], value: `cname.${root}` },
    isApex,
  };
}
