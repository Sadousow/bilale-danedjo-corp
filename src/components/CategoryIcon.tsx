import { ShoppingBasket, SprayCan, Refrigerator, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/products";

const map: Record<Category, LucideIcon> = {
  alimentation: ShoppingBasket,
  entretien: SprayCan,
  electromenager: Refrigerator,
};

type Props = {
  category: Category;
  className?: string;
};

export default function CategoryIcon({ category, className = "w-6 h-6" }: Props) {
  const Icon = map[category];
  return <Icon className={className} strokeWidth={1.75} />;
}
