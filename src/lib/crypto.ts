import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Chiffrement des secrets stockés en base — aujourd'hui les clés Djomy des
 * marchands. AES-256-GCM : confidentialité et détection d'altération.
 *
 * La clé maître vient de `TENANT_SECRET_KEY`. La changer rend illisibles tous
 * les secrets déjà chiffrés : prévoir une rotation explicite le jour venu.
 */

const PREFIX = "v1";

function masterKey(): Buffer {
  const raw = process.env.TENANT_SECRET_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "TENANT_SECRET_KEY manquante ou trop courte (32 caractères minimum)."
    );
  }
  // Dérivation en 32 octets, quelle que soit la longueur fournie.
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return "";

  try {
    const [, iv, tag, data] = parts;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      masterKey(),
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Clé maître changée, ou donnée altérée.
    return "";
  }
}

/** Masque un secret pour l'affichage : ****1234 */
export function maskSecret(value: string): string {
  if (!value) return "";
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}
