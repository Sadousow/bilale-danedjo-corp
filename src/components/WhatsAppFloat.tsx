"use client";

import { motion } from "framer-motion";
import { useShopConfig } from "@/components/shop/shop-config";
import WhatsAppIcon from "./WhatsAppIcon";

export default function WhatsAppFloat() {
  const shop = useShopConfig();
  return (
    <motion.a
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      href={shop.whatsappLink("Bonjour, je souhaite obtenir des informations sur vos produits.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full p-4 shadow-lg hover:shadow-xl"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" aria-hidden />
      <WhatsAppIcon className="w-6 h-6 relative" />
    </motion.a>
  );
}
