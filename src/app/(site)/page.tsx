import HomeBlocks, { type BlockData } from "@/components/blocks/HomeBlocks";
import {
  getCatalogCategories,
  getPopularProducts,
  getPromoProducts,
  getRecentProducts,
} from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { isRenderableImage } from "@/lib/storage";
import { previewDraft } from "@/lib/home-draft";
import type { Block } from "@/lib/blocks";

/**
 * La page d'accueil est composée par le marchand : une suite de blocs que nous
 * fournissons, rendus dans l'ordre qu'il a choisi. Aucun balisage ne vient de
 * la base — seulement des textes, des couleurs et des identifiants de section.
 */

/** Ne garde que les images d'un domaine autorisé par `next.config.ts`. */
function withSafeImages(blocks: Block[]): Block[] {
  return blocks.map((block) =>
    block.props.imageUrl && !isRenderableImage(block.props.imageUrl)
      ? { ...block, props: { ...block.props, imageUrl: undefined } }
      : block
  );
}

export default async function HomePage() {
  const [settings, draft] = await Promise.all([getSettings(), previewDraft()]);

  // `previewDraft()` ne renvoie quelque chose qu'à un administrateur connecté
  // ayant demandé l'aperçu. Pour tout le monde d'autre, la page publiée.
  const blocks = withSafeImages(draft?.blocks ?? settings.homeBlocks);

  // On ne va chercher que ce que la composition affiche réellement : une
  // boutique sans bloc « promotions » ne paie pas cette requête.
  const sources = new Set(
    blocks
      .filter((b) => b.visible && b.type === "produits")
      .map((b) => b.props.source ?? "populaires")
  );
  const needsCategories = blocks.some((b) => b.visible && b.type === "categories");

  const [categories, popular, promotions, recents] = await Promise.all([
    needsCategories ? getCatalogCategories() : Promise.resolve([]),
    sources.has("populaires") ? getPopularProducts(24) : Promise.resolve([]),
    sources.has("promotions") ? getPromoProducts() : Promise.resolve([]),
    sources.has("recents") ? getRecentProducts(24) : Promise.resolve([]),
  ]);

  const data: BlockData = {
    categories,
    popular,
    promotions,
    recents,
    highlights: settings.highlights,
    whatsappNumber: settings.whatsappNumber,
  };

  return <HomeBlocks blocks={blocks} data={data} />;
}
