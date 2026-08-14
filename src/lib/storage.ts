import "server-only";

import { randomBytes } from "node:crypto";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Stockage des images des marchands — S3 ou compatible (Cloudflare R2).
 *
 * Le fichier ne transite pas par le serveur : on signe une URL, le navigateur
 * envoie directement au stockage. C'est ce qui permet d'accepter des photos de
 * téléphone de plusieurs mégaoctets sans buter sur la limite de taille des
 * Server Actions.
 *
 * Variables d'environnement :
 *   S3_ENDPOINT       https://<compte>.r2.cloudflarestorage.com
 *   S3_REGION         « auto » pour R2
 *   S3_BUCKET
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_PUBLIC_URL     base publique du bucket (domaine R2 ou domaine perso)
 */

const ENDPOINT = process.env.S3_ENDPOINT ?? "";
const REGION = process.env.S3_REGION ?? "auto";
const BUCKET = process.env.S3_BUCKET ?? "";
/**
 * Base publique du bucket, normalisée.
 * Un domaine nu sans `https://` est complété : c'est l'erreur de saisie la
 * plus fréquente, et elle produisait jusqu'ici des adresses d'images sans
 * schéma, donc des visuels cassés partout.
 */
function normalizeBase(value: string | undefined): string {
  const raw = (value ?? "").trim().replace(/\/$/, "");
  if (!raw) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const PUBLIC_URL = normalizeBase(process.env.S3_PUBLIC_URL);

export function isStorageConfigured(): boolean {
  return Boolean(
    ENDPOINT &&
      BUCKET &&
      PUBLIC_URL &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      // R2 et la plupart des compatibles exigent le style « path ».
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return client;
}

/** Types d'images acceptés — liste blanche, jamais une liste noire. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Taille maximale acceptée après redimensionnement côté navigateur. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type UploadKind = "logo" | "banniere" | "produit";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Chemin de l'objet dans le bucket.
 * Le tenant est le premier segment : une boutique ne peut pas écrire chez une
 * autre, puisque le serveur seul décide de ce préfixe.
 */
function buildKey(tenantId: string, kind: UploadKind, contentType: string): string {
  const extension = EXTENSIONS[contentType] ?? "bin";
  const unique = randomBytes(8).toString("hex");
  return `t/${tenantId}/${kind}/${Date.now()}-${unique}.${extension}`;
}

export function publicUrlFor(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export type PresignResult =
  | { ok: true; uploadUrl: string; key: string; publicUrl: string }
  | { ok: false; error: string };

/** Signe une URL d'envoi valable 5 minutes. */
export async function presignUpload(input: {
  tenantId: string;
  kind: UploadKind;
  contentType: string;
  size: number;
}): Promise<PresignResult> {
  if (!isStorageConfigured()) {
    return {
      ok: false,
      error:
        "Le stockage d'images n'est pas configuré sur ce serveur. Contactez le support.",
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType as never)) {
    return {
      ok: false,
      error: "Format non accepté. Utilisez une image JPEG, PNG ou WebP.",
    };
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: "Fichier vide." };
  }

  if (input.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Image trop lourde (${Math.round(input.size / 1024 / 1024)} Mo). Maximum ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo.`,
    };
  }

  const key = buildKey(input.tenantId, input.kind, input.contentType);

  try {
    const uploadUrl = await getSignedUrl(
      s3(),
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
      }),
      { expiresIn: 300 }
    );

    return { ok: true, uploadUrl, key, publicUrl: publicUrlFor(key) };
  } catch {
    return {
      ok: false,
      error: "Impossible de préparer l'envoi. Réessayez dans un instant.",
    };
  }
}

/**
 * Supprime une image dont on a l'URL publique.
 * On refuse de toucher à un objet qui n'appartient pas au tenant : une URL
 * arrivant du navigateur ne doit jamais permettre d'effacer chez un voisin.
 */
export async function deleteImage(
  tenantId: string,
  url: string | null | undefined
): Promise<void> {
  if (!url || !isStorageConfigured() || !url.startsWith(PUBLIC_URL)) return;

  const key = url.slice(PUBLIC_URL.length + 1);
  if (!key.startsWith(`t/${tenantId}/`)) return;

  try {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Un objet orphelin est moins grave qu'une action bloquée.
  }
}

/**
 * `next/image` refuse — à l'exécution — tout domaine absent de
 * `next.config.ts`. Une URL d'image saisie à la main dans un bloc casserait
 * donc la page entière. On vérifie avant de rendre.
 */
export function isRenderableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === storageHostname() || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

/** Le domaine du stockage, à autoriser dans `next.config.ts`. */
export function storageHostname(): string | null {
  try {
    return PUBLIC_URL ? new URL(PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
}
