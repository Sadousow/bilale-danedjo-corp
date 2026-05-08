import { whatsappLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink("Bonjour, je souhaite obtenir des informations sur vos produits.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-105"
    >
      <WhatsAppIcon className="w-6 h-6" />
    </a>
  );
}
