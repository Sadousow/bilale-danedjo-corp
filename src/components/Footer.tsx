import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Logo from "./Logo";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "./SocialIcons";
import { siteConfig } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-blue-dark text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo size="lg" />
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              {siteConfig.description}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-brand-gold transition-colors">Accueil</Link></li>
              <li><Link href="/a-propos" className="hover:text-brand-gold transition-colors">À propos</Link></li>
              <li><Link href="/produits" className="hover:text-brand-gold transition-colors">Produits</Link></li>
              <li><Link href="/promotions" className="hover:text-brand-gold transition-colors">Promotions</Link></li>
              <li><Link href="/faq" className="hover:text-brand-gold transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-brand-gold transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Catégories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/produits?cat=alimentation" className="hover:text-brand-gold transition-colors">Alimentation générale</Link></li>
              <li><Link href="/produits?cat=entretien" className="hover:text-brand-gold transition-colors">Produits d&apos;entretien</Link></li>
              <li><Link href="/produits?cat=electromenager" className="hover:text-brand-gold transition-colors">Électroménager</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <MapPin className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{siteConfig.address}</span>
              </li>
              <li className="flex gap-2">
                <Phone className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                <a href={`tel:${siteConfig.phone}`} className="hover:text-brand-gold transition-colors">{siteConfig.phone}</a>
              </li>
              <li className="flex gap-2">
                <Mail className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-brand-gold transition-colors break-all">{siteConfig.email}</a>
              </li>
              <li className="flex gap-2">
                <Clock className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{siteConfig.hours}</span>
              </li>
            </ul>

            <div className="flex gap-3 mt-5">
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors">
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href={siteConfig.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors">
                <TikTokIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© {year} {siteConfig.name}. Tous droits réservés.</p>
          <p>Distribution & commerce — Conakry, Guinée</p>
        </div>
      </div>
    </footer>
  );
}
