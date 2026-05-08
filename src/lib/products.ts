export type Category = "alimentation" | "entretien" | "electromenager";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit?: string;
  image: string;
  description: string;
  popular?: boolean;
  promo?: { discount: number; oldPrice: number };
  inStock: boolean;
};

export const categories: { key: Category; label: string; description: string; icon: string }[] = [
  {
    key: "alimentation",
    label: "Alimentation générale",
    description: "Riz, sucre, huile, boissons, conserves, pâtes alimentaires",
    icon: "🛒",
  },
  {
    key: "entretien",
    label: "Produits d'entretien",
    description: "Détergents, savons, javel, désinfectants, produits ménagers",
    icon: "🧴",
  },
  {
    key: "electromenager",
    label: "Électroménager",
    description: "Ventilateurs, réfrigérateurs, téléviseurs, mixeurs, cuisinières",
    icon: "🏠",
  },
];

const img = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=70`;

export const products: Product[] = [
  // Alimentation
  {
    id: "riz-parfume-25kg",
    name: "Riz parfumé 25 kg",
    category: "alimentation",
    price: 285000,
    unit: "sac",
    image: img("photo-1586201375761-83865001e31c"),
    description: "Riz parfumé de qualité supérieure, sac de 25 kg — idéal pour familles et restaurants.",
    popular: true,
    inStock: true,
  },
  {
    id: "huile-tournesol-5l",
    name: "Huile de tournesol 5 L",
    category: "alimentation",
    price: 95000,
    unit: "bidon",
    image: img("photo-1474979266404-7eaacbcd87c5"),
    description: "Huile de tournesol raffinée, bidon de 5 litres pour usage domestique.",
    inStock: true,
  },
  {
    id: "sucre-50kg",
    name: "Sucre cristallisé 50 kg",
    category: "alimentation",
    price: 480000,
    unit: "sac",
    image: img("photo-1610632380989-680fe40816c6"),
    description: "Sucre blanc cristallisé en sac de 50 kg pour boutiques et restaurants.",
    promo: { discount: 8, oldPrice: 520000 },
    inStock: true,
  },
  {
    id: "pates-spaghetti",
    name: "Pâtes spaghetti carton",
    category: "alimentation",
    price: 145000,
    unit: "carton",
    image: img("photo-1551462147-37885acc36f1"),
    description: "Carton de pâtes spaghetti — 20 paquets de 500 g.",
    popular: true,
    inStock: true,
  },
  {
    id: "tomate-conserve",
    name: "Concentré de tomate (carton)",
    category: "alimentation",
    price: 98000,
    unit: "carton",
    image: img("photo-1588165171080-c89acfa5ee83"),
    description: "Carton de concentré de tomate, 50 boîtes de 70 g.",
    inStock: true,
  },
  {
    id: "boissons-pack",
    name: "Pack boissons gazeuses",
    category: "alimentation",
    price: 75000,
    unit: "pack",
    image: img("photo-1581636625402-29b2a704ef13"),
    description: "Pack de 24 boissons gazeuses 33 cl, idéal pour événements.",
    promo: { discount: 12, oldPrice: 85000 },
    inStock: true,
  },

  // Entretien
  {
    id: "detergent-omo-5kg",
    name: "Détergent en poudre 5 kg",
    category: "entretien",
    price: 68000,
    unit: "sac",
    image: img("photo-1583947581924-860bda3c8472"),
    description: "Lessive en poudre haute performance, sac de 5 kg.",
    popular: true,
    inStock: true,
  },
  {
    id: "javel-5l",
    name: "Eau de javel 5 L",
    category: "entretien",
    price: 22000,
    unit: "bidon",
    image: img("photo-1585421514738-01798e348b17"),
    description: "Eau de javel concentrée, bidon de 5 litres pour la désinfection.",
    inStock: true,
  },
  {
    id: "savon-multipack",
    name: "Savon de Marseille (carton)",
    category: "entretien",
    price: 55000,
    unit: "carton",
    image: img("photo-1607006677517-37bbf1bcf26e"),
    description: "Carton de 24 savons de Marseille de 200 g.",
    inStock: true,
  },
  {
    id: "desinfectant-multi",
    name: "Désinfectant multi-surfaces 1 L",
    category: "entretien",
    price: 18000,
    unit: "bouteille",
    image: img("photo-1563453392212-326f5e854473"),
    description: "Désinfectant multi-surfaces, élimine 99,9 % des bactéries.",
    promo: { discount: 15, oldPrice: 22000 },
    inStock: true,
  },

  // Électroménager
  {
    id: "frigo-double-porte",
    name: "Réfrigérateur double porte 350 L",
    category: "electromenager",
    price: 4250000,
    unit: "unité",
    image: img("photo-1571175443880-49e1d25b2bc5"),
    description: "Réfrigérateur double porte 350 L, classe A+, garantie 2 ans.",
    popular: true,
    inStock: true,
  },
  {
    id: "tv-led-43",
    name: "Téléviseur LED 43\"",
    category: "electromenager",
    price: 2850000,
    unit: "unité",
    image: img("photo-1593359677879-a4bb92f829d1"),
    description: "Téléviseur LED Full HD 43 pouces avec ports HDMI et USB.",
    promo: { discount: 10, oldPrice: 3150000 },
    inStock: true,
  },
  {
    id: "ventilateur-stand",
    name: "Ventilateur sur pied",
    category: "electromenager",
    price: 425000,
    unit: "unité",
    image: img("photo-1565374395542-0ce18882c857"),
    description: "Ventilateur sur pied 3 vitesses, oscillation, télécommande.",
    inStock: true,
  },
  {
    id: "mixeur-pro",
    name: "Mixeur multifonction 600 W",
    category: "electromenager",
    price: 580000,
    unit: "unité",
    image: img("photo-1570222094114-d054a817e56b"),
    description: "Mixeur 600 W avec bol 1,5 L et accessoires interchangeables.",
    inStock: true,
  },
  {
    id: "cuisiniere-4-feux",
    name: "Cuisinière 4 feux + four",
    category: "electromenager",
    price: 3650000,
    unit: "unité",
    image: img("photo-1556909114-f6e7ad7d3136"),
    description: "Cuisinière à gaz 4 feux avec four électrique et grill.",
    popular: true,
    inStock: true,
  },
];

export function getProductsByCategory(category: Category): Product[] {
  return products.filter((p) => p.category === category);
}

export function getPopularProducts(limit = 6): Product[] {
  return products.filter((p) => p.popular).slice(0, limit);
}

export function getPromoProducts(): Product[] {
  return products.filter((p) => p.promo);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR").format(price) + " GNF";
}
