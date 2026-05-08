export const siteConfig = {
  name: "Bilale et Danedjo Corporation SARLU",
  shortName: "Bilale & Danedjo",
  slogan: "Votre partenaire du quotidien",
  description:
    "Distribution et commerce de détail en Guinée — alimentation générale, produits d'entretien et électroménager.",
  whatsapp: "224624390332",
  phone: "+224 624 39 03 32",
  email: "contact@bdcorporation.com",
  address: "Conakry, République de Guinée",
  hours: "Lun – Sam : 08h00 – 20h00",
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/",
  },
};

export function whatsappLink(message: string): string {
  const text = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.whatsapp}?text=${text}`;
}
