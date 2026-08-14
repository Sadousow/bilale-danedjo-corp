import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { platformDb } from "@/lib/db";

/**
 * Limitation des tentatives d'authentification.
 *
 * Deux compteurs indépendants à chaque connexion :
 *
 *   - **le compte visé** — arrête l'essai méthodique de mots de passe sur
 *     une adresse connue ;
 *   - **l'adresse IP** — arrête le bourrage d'identifiants, où l'attaquant
 *     essaie un seul mot de passe sur des milliers de comptes et ne
 *     déclencherait jamais le premier compteur.
 *
 * Ce qu'il faut en attendre : cela repousse la devinette en ligne et le
 * bourrage d'identifiants. Cela ne protège pas d'un mot de passe faible ni
 * d'une attaque répartie sur des milliers d'adresses. La solidité des mots de
 * passe reste la vraie défense.
 */

export type ThrottleRule = {
  /** Échecs tolérés avant verrouillage. */
  max: number;
  /** Durée d'observation, en minutes. */
  window: number;
  /** Durée du premier verrou, en minutes. Elle double aux suivants. */
  lock: number;
  /** Plafond de la durée de verrou, en minutes. */
  maxLock: number;
};

/**
 * Le compteur par compte est volontairement plus indulgent que celui par
 * adresse : quelqu'un peut bloquer un compte en s'y trompant exprès, et un
 * marchand enfermé dehors est un problème réel. Le compteur par adresse, lui,
 * ne gêne que celui qui insiste.
 */
export const RULES = {
  compte: { max: 8, window: 15, lock: 15, maxLock: 60 },
  adresse: { max: 30, window: 15, lock: 30, maxLock: 120 },
  inscription: { max: 5, window: 60, lock: 60, maxLock: 240 },
} as const satisfies Record<string, ThrottleRule>;

export type Bucket = { key: string; rule: ThrottleRule };

export type ThrottleVerdict =
  | { blocked: false }
  | { blocked: true; retryAfterSeconds: number; message: string };

const SECRET = process.env.SESSION_SECRET ?? "";

/**
 * Les clés sont hachées : la table n'a pas besoin de contenir les emails ni
 * les adresses IP de qui se trompe de mot de passe. Un HMAC — et non un
 * simple hachage — pour qu'une copie de la base ne permette pas de tester
 * une liste d'adresses connues.
 */
function digest(scope: string, subject: string): string {
  return createHmac("sha256", SECRET)
    .update(`${scope}:${subject.trim().toLowerCase()}`)
    .digest("base64url")
    .slice(0, 32);
}

/** Adresse de l'appelant, telle que la transmet l'hébergeur. */
export async function callerAddress(): Promise<string> {
  const store = await headers();
  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    "inconnue"
  );
}

/** Compteurs à surveiller pour une tentative de connexion. */
export async function loginBuckets(
  scope: string,
  account: string
): Promise<Bucket[]> {
  return [
    { key: digest(`${scope}:compte`, account), rule: RULES.compte },
    { key: digest(`${scope}:ip`, await callerAddress()), rule: RULES.adresse },
  ];
}

function minutes(n: number): number {
  return n * 60_000;
}

function humanDelay(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  if (m <= 1) return "une minute";
  if (m < 60) return `${m} minutes`;
  const h = Math.ceil(m / 60);
  return h === 1 ? "une heure" : `${h} heures`;
}

/**
 * À appeler **avant** la vérification du mot de passe : c'est le calcul
 * bcrypt qui coûte cher, et c'est donc lui qu'il faut protéger.
 */
export async function checkThrottle(buckets: Bucket[]): Promise<ThrottleVerdict> {
  const now = new Date();

  try {
    const rows = await platformDb.authAttempt.findMany({
      where: { key: { in: buckets.map((b) => b.key) } },
      select: { key: true, lockedUntil: true },
    });

    let longest = 0;
    for (const row of rows) {
      if (row.lockedUntil && row.lockedUntil > now) {
        longest = Math.max(longest, row.lockedUntil.getTime() - now.getTime());
      }
    }

    if (longest > 0) {
      const retryAfterSeconds = Math.ceil(longest / 1000);
      return {
        blocked: true,
        retryAfterSeconds,
        message: `Trop de tentatives. Réessayez dans ${humanDelay(retryAfterSeconds)}.`,
      };
    }

    return { blocked: false };
  } catch {
    // Base indisponible : on laisse passer plutôt que de fermer la porte à
    // tout le monde. Le mot de passe reste vérifié juste après.
    return { blocked: false };
  }
}

/** Incrémente les compteurs après un échec, et verrouille si besoin. */
export async function registerFailure(buckets: Bucket[]): Promise<void> {
  const now = new Date();

  for (const bucket of buckets) {
    try {
      const row = await platformDb.authAttempt.findUnique({
        where: { key: bucket.key },
      });

      // Fenêtre expirée : on repart de zéro, mais on garde la mémoire des
      // verrous passés pour que le récidiviste attende plus longtemps.
      const expired =
        !row || now.getTime() - row.firstAt.getTime() > minutes(bucket.rule.window);

      const count = expired ? 1 : row.count + 1;
      const lockCount = row?.lockCount ?? 0;

      if (count >= bucket.rule.max) {
        const duration = Math.min(
          bucket.rule.lock * 2 ** lockCount,
          bucket.rule.maxLock
        );

        await platformDb.authAttempt.upsert({
          where: { key: bucket.key },
          create: {
            key: bucket.key,
            count: 0,
            lockCount: 1,
            lockedUntil: new Date(now.getTime() + minutes(duration)),
          },
          update: {
            count: 0,
            lockCount: lockCount + 1,
            firstAt: now,
            lastAt: now,
            lockedUntil: new Date(now.getTime() + minutes(duration)),
          },
        });
      } else {
        await platformDb.authAttempt.upsert({
          where: { key: bucket.key },
          create: { key: bucket.key, count: 1 },
          update: {
            count,
            lastAt: now,
            ...(expired ? { firstAt: now } : {}),
          },
        });
      }
    } catch {
      // Un compteur perdu ne doit pas empêcher de répondre à l'utilisateur.
    }
  }

  await occasionalCleanup();
}

/**
 * Efface les compteurs après une connexion réussie.
 * Sans cela, huit erreurs de frappe étalées sur la journée finiraient par
 * verrouiller un compte parfaitement légitime.
 */
export async function registerSuccess(buckets: Bucket[]): Promise<void> {
  try {
    await platformDb.authAttempt.deleteMany({
      where: { key: { in: buckets.map((b) => b.key) } },
    });
  } catch {
    // Sans conséquence : la ligne expirera d'elle-même.
  }
}

/**
 * Purge les lignes inactives. Déclenchée au hasard, environ une fois sur
 * cinquante : pas de tâche planifiée à maintenir pour une table de cette
 * taille.
 */
async function occasionalCleanup(): Promise<void> {
  if (Math.random() > 0.02) return;

  try {
    await platformDb.authAttempt.deleteMany({
      where: {
        lastAt: { lt: new Date(Date.now() - minutes(60 * 24)) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
    });
  } catch {
    // Sans conséquence.
  }
}
