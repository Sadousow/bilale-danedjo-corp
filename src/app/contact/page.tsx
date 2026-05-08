import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ContactForm from "./ContactForm";
import { siteConfig, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Bilale et Danedjo Corporation SARLU — WhatsApp, téléphone, email, adresse à Conakry.",
};

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
                  <li className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-brand-blue">Adresse</p>
                      <p className="text-slate-600">{siteConfig.address}</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-brand-blue">Téléphone</p>
                      <a href={`tel:${siteConfig.phone}`} className="text-slate-600 hover:text-brand-blue">
                        {siteConfig.phone}
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-brand-blue">Email</p>
                      <a href={`mailto:${siteConfig.email}`} className="text-slate-600 hover:text-brand-blue break-all">
                        {siteConfig.email}
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-brand-blue">Horaires</p>
                      <p className="text-slate-600">{siteConfig.hours}</p>
                    </div>
                  </li>
                </ul>

                <a
                  href={whatsappLink("Bonjour, je souhaite obtenir des informations.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 rounded-md font-semibold transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
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
