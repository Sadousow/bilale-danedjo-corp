import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import ContactForm from "./ContactForm";
import { buildWhatsAppLink } from "@/lib/site";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Nos coordonnées : WhatsApp, téléphone, email et adresse.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  const items = [
    { icon: MapPin, label: "Adresse", value: settings.companyAddress },
    { icon: Phone, label: "Téléphone", value: settings.companyPhone, href: `tel:${settings.companyPhone}` },
    { icon: Mail, label: "Email", value: settings.companyEmail, href: `mailto:${settings.companyEmail}` },
    // Les horaires viennent du marchand. Cette ligne servait ceux du commerce
    // d'origine à toutes les boutiques, en ignorant purement les réglages.
    { icon: Clock, label: "Horaires", value: settings.openingHours },
  ];

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
            <Reveal className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display font-bold text-brand-blue text-xl">
                  Coordonnées
                </h3>
                <Stagger className="mt-5 space-y-4 text-sm" staggerDelay={0.07}>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <StaggerItem key={item.label} className="flex gap-3" y={12}>
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
                      </StaggerItem>
                    );
                  })}
                </Stagger>

                {settings.whatsappNumber && (
                  <a
                    href={buildWhatsAppLink(settings.whatsappNumber, "Bonjour, je souhaite obtenir des informations.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    /* Le vert reste celui de WhatsApp : c'est la marque du
                       service, pas celle du marchand. */
                    className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 rounded-md font-semibold transition-colors"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                    Discuter sur WhatsApp
                  </a>
                )}
              </div>

              {/* La carte suit l'adresse du marchand. Elle était figée sur
                  Conakry : une boutique à Kankan ou à Labé montrait une ville
                  où elle n'est pas. Sans adresse renseignée, pas de carte. */}
              {settings.companyAddress && (
              <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video">
                <iframe
                  title={`Carte — ${settings.companyAddress}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.companyAddress)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
              )}
            </Reveal>

            <Reveal delay={0.15} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <h3 className="font-display font-bold text-brand-blue text-xl">
                Envoyer un message
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Remplissez ce formulaire — votre message s&apos;ouvrira directement dans WhatsApp.
              </p>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
