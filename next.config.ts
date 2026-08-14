import type { NextConfig } from "next";

/**
 * Domaine du stockage d'images, tiré de `S3_PUBLIC_URL`.
 *
 * Un domaine nu — `images.guygou.com` — est accepté et complété. Sans cette
 * tolérance, `new URL()` lève une exception au chargement de la
 * configuration : le serveur refuse de démarrer, avec un message qui ne dit
 * pas quelle variable est en cause.
 */
function storageHostname(): string | null {
  const raw = (process.env.S3_PUBLIC_URL ?? "").trim();
  if (!raw) return null;
  try {
    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(url).hostname;
  } catch {
    console.warn(
      `[config] S3_PUBLIC_URL est illisible : « ${raw} ». Les images du stockage ne seront pas affichées.`
    );
    return null;
  }
}

const hostname = storageHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Stockage des images des marchands (S3 / Cloudflare R2).
      ...(hostname ? [{ protocol: "https" as const, hostname }] : []),
    ],
  },
};

export default nextConfig;
