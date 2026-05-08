import Image from "next/image";
import { type Product, formatPrice } from "@/lib/products";
import { whatsappLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const message = `Bonjour, je suis intéressé par le produit "${product.name}" (${formatPrice(product.price)}). Pouvez-vous me donner plus d'informations ?`;

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.promo && (
          <span className="absolute top-3 left-3 bg-brand-gold text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            -{product.promo.discount}%
          </span>
        )}
        {product.popular && !product.promo && (
          <span className="absolute top-3 left-3 bg-brand-blue text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
            Populaire
          </span>
        )}
        {!product.inStock && (
          <span className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Rupture
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display font-semibold text-base text-brand-blue group-hover:text-brand-blue-light transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2 flex-1">
          {product.description}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-blue">
            {formatPrice(product.price)}
          </span>
          {product.promo && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.promo.oldPrice)}
            </span>
          )}
          {product.unit && (
            <span className="text-xs text-slate-500">/ {product.unit}</span>
          )}
        </div>

        <a
          href={whatsappLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-brand-gold hover:bg-brand-gold-dark text-white text-sm font-semibold px-4 py-2.5 rounded-md transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4" />
          Commander
        </a>
      </div>
    </article>
  );
}
