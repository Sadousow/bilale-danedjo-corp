import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

import { platformDb } from "@/lib/db";

/**
 * Réinitialisation de mot de passe.
 *
 * Trois familles de comptes, un seul mécanisme :
 *   - `staff`      — personnel d'une boutique (table User)
 *   - `client`     — client d'une boutique (table Customer)
 *   - `plateforme` — agent de la plateforme (table PlatformUser)
 *
 * Quatre décisions structurent ce fichier :
 *
 * 1. **Le jeton est haché en base.** Il n'existe en clair que dans le lien
 *    envoyé. Une fuite de la base ne donne pas la main sur les demandes en
 *    cours.
 * 2. **Usage unique et durée courte.** Un lien consommé ou périmé ne vaut
 *    plus rien, et une réinitialisation réussie annule tous les autres liens
 *    du même compte.
 * 3. **Aucune réponse ne révèle si un compte existe.** L'appelant reçoit le
 *    même message dans tous les cas — sinon le formulaire devient un outil
 *    pour découvrir qui est client de qui.
 * 4. **Le lien ne dit pas à quelle boutique il appartient.** Le scope et le
 *    tenant sont lus depuis la base, pas depuis l'URL.
 */

export type ResetScope = "staff" | "client" | "plateforme";

/** Confirmation d'adresse : même mécanisme, autre usage. */
export type TokenScope = ResetScope | "email-client";

/** Une heure : assez pour aller chercher ses identifiants, pas plus. */
export const RESET_TTL_MINUTES = 60;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crée un jeton et renvoie sa forme en clair, à ne poser que dans le lien.
 * Les demandes précédentes du même compte sont annulées : sinon plusieurs
 * liens vivants circuleraient en même temps.
 */
export async function createResetToken(input: {
  scope: ResetScope;
  subjectId: string;
  tenantId?: string | null;
}): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await platformDb.verificationToken.updateMany({
    where: { scope: input.scope, subjectId: input.subjectId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await platformDb.verificationToken.create({
    data: {
      tokenHash: hash(token),
      scope: input.scope,
      subjectId: input.subjectId,
      tenantId: input.tenantId ?? null,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });

  await purgeExpired();

  return token;
}

export type ResetRecord = {
  id: string;
  scope: ResetScope;
  subjectId: string;
  tenantId: string | null;
};

/**
 * Relit un jeton présenté par un visiteur. Renvoie null s'il est inconnu,
 * expiré ou déjà consommé — sans distinguer les trois cas, qui ne regardent
 * pas l'appelant.
 */
export async function readResetToken(
  token: string | null | undefined
): Promise<ResetRecord | null> {
  const raw = (token ?? "").trim();
  if (!raw || raw.length > 200) return null;

  try {
    const row = await platformDb.verificationToken.findUnique({
      where: { tokenHash: hash(raw) },
    });

    if (!row) return null;
    if (row.usedAt) return null;
    if (row.expiresAt <= new Date()) return null;

    return {
      id: row.id,
      scope: row.scope as ResetScope,
      subjectId: row.subjectId,
      tenantId: row.tenantId,
    };
  } catch {
    return null;
  }
}

/**
 * Applique le nouveau mot de passe et brûle le jeton.
 *
 * La mise à jour du compte et la consommation du jeton se font dans une
 * transaction : sans cela, un incident entre les deux laisserait soit un
 * lien réutilisable, soit un mot de passe changé sans trace.
 */
export async function applyReset(
  record: ResetRecord,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (password.length < 8) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  try {
    await platformDb.$transaction(async (tx: typeof platformDb) => {
      // Le jeton n'est consommé que s'il ne l'était pas déjà : deux clics
      // simultanés sur le même lien ne doivent produire qu'une réinitialisation.
      const burnt = await tx.verificationToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });

      if (burnt.count === 0) throw new Error("jeton déjà consommé");

      if (record.scope === "staff") {
        await tx.user.update({
          where: { id: record.subjectId },
          data: { passwordHash },
        });
      } else if (record.scope === "client") {
        await tx.customer.update({
          where: { id: record.subjectId },
          data: { passwordHash },
        });
      } else {
        await tx.platformUser.update({
          where: { id: record.subjectId },
          data: { passwordHash },
        });
      }

      // Les autres liens éventuels du compte perdent leur valeur.
      await tx.verificationToken.updateMany({
        where: { scope: record.scope, subjectId: record.subjectId, usedAt: null },
        data: { usedAt: now },
      });
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Ce lien n'est plus valable. Demandez-en un nouveau.",
    };
  }
}

/** Comparaison à durée constante, pour les usages hors base. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function purgeExpired(): Promise<void> {
  // Une fois sur vingt : la table reste petite sans tâche planifiée dédiée.
  if (Math.random() > 0.05) return;

  try {
    await platformDb.verificationToken.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 3600_000) } },
    });
  } catch {
    // Sans conséquence.
  }
}
