import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bilale-danedjo.com";
  const routes = ["", "/a-propos", "/produits", "/promotions", "/contact", "/faq"];
  const now = new Date();
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.8,
  }));
}
