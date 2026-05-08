import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import ContactForm from "./ContactForm";
import { siteConfig, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Bilale et Danedjo Corporation SARLU — WhatsApp, téléphone, email, adresse à Conakry.",
};

const items = [
  { icon: MapPin, label: "Adresse", value: siteConfig.address },
  { icon: Phone, label: "Téléphone", value: siteConfig.phone, href: `tel:${siteConfig.phone}` },
  { icon: Mail, label: "Email", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { icon: Clock, label: "Horaires", value: siteConfig.hours },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Nous contacter"
        title="Parlons de votre projet"
        description="Nous sommes à votre écoute pour toute commande, devis ou information."
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display font-bold text-brand-blue text-xl">
                  Coordonnées
                </h3>
                <ul className="mt-5 space-y-4 text-sm">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                          <Icon className="w-5 h-5" strokeWidth={1.75} />
                        </div>
                        <div>
                          <p className="font-semibold text-brand-blue">{item.label}</p>
                          {item.href ? (
                            <a href={item.href} className="text-slate-600 hover:text-brand-blue break-all">
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-slate-600">{item.value}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <a
                  href={whatsappLink("Bonjour, je souhaite obtenir des informations.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 rounded-md font-semibold transition-colors"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  Discuter sur WhatsApp
                </a>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video">
                <iframe
                  title="Carte Conakry"
                  src="https://maps.google.com/maps?q=Conakry,%20Guinea&t=&z=12&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <h3 className="font-display font-bold text-brand-blue text-xl">
                Envoyer un message
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Remplissez ce formulaire — votre message s&apos;ouvrira directement dans WhatsApp.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
