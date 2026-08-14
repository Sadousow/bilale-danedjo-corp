"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useShopConfig } from "@/components/shop/shop-config";

export default function ContactForm() {
  const shop = useShopConfig();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Demande d'information");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = `Bonjour, je m'appelle ${name}.\nTéléphone : ${phone}\nSujet : ${subject}\n\n${message}`;
    window.open(shop.whatsappLink(text), "_blank", "noopener,noreferrer");
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Nom complet
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Votre nom"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
          Téléphone
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="+224 6XX XX XX XX"
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">
          Sujet
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        >
          <option>Demande d&apos;information</option>
          <option>Passer commande</option>
          <option>Demande de devis professionnel</option>
          <option>Question sur un produit</option>
          <option>Autre</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
          placeholder="Décrivez votre besoin…"
        />
      </div>
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white px-4 py-3 rounded-md font-semibold transition-colors"
      >
        Envoyer via WhatsApp
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
