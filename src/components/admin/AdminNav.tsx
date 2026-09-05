"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Menu,
  Package,
  Palette,
  Receipt,
  ScanLine,
  Settings,
  Share2,
  ShoppingBag,
  UserCog,
  Users,
  X,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag, feature: "shop" },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/stock", label: "Stock", icon: Boxes },
  { href: "/admin/ventes", label: "Ventes en caisse", icon: Receipt },
  { href: "/admin/factures", label: "Facturation", icon: FileText, feature: "invoicing" },
  { href: "/admin/clients", label: "Clients & crédits", icon: Users },
  { href: "/admin/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog, adminOnly: true },
  { href: "/admin/abonnement", label: "Abonnement", icon: CreditCard, adminOnly: true },
  { href: "/admin/apparence", label: "Apparence", icon: Palette, adminOnly: true, exact: true },
  { href: "/admin/apparence/accueil", label: "Page d'accueil", icon: LayoutTemplate, adminOnly: true, feature: "shop" },
  { href: "/admin/reseaux-sociaux", label: "Réseaux sociaux", icon: Share2, adminOnly: true },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings, adminOnly: true },
];

/**
 * Sections encore ouvertes quand la boutique est fermée faute de paiement :
 * payer, et récupérer ses données. La liste est la même que côté serveur —
 * la garde qui compte est celle de la mise en page, celle-ci n'est là que
 * pour ne pas proposer un lien qui renverra ailleurs.
 */
const OPEN_WHEN_UNPAID = ["/admin/abonnement", "/admin/rapports"];

function NavLinks({
  role,
  locked,
  unpaid,
  onNavigate,
}: {
  role: string;
  /** Fonctions absentes de l'offre en cours. */
  locked: string[];
  /** Boutique fermée faute de paiement. */
  unpaid?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = items.filter((i) => !i.adminOnly || role === "ADMIN");

  return (
    <nav className="space-y-1">
      {visible.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        /*
         * Une section non comprise dans l'offre reste visible, avec un
         * cadenas. La masquer serait plus propre mais le marchand ignorerait
         * ce qu'il pourrait avoir — et ne monterait donc jamais d'offre. Le
         * lien fonctionne : il mène à l'écran qui explique et donne le prix.
         */
        const isLocked = Boolean(item.feature && locked.includes(item.feature));

        // Fermeture pour impayé : la section est barrée, pas cliquable. Un
        // lien qui renvoie systématiquement ailleurs use la patience.
        const isClosed =
          Boolean(unpaid) && !OPEN_WHEN_UNPAID.includes(item.href);

        if (isClosed) {
          return (
            <span
              key={item.href}
              title="Réglez votre abonnement pour rouvrir cette section"
              aria-disabled="true"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 cursor-not-allowed"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {/* Barré, et pas seulement grisé : le cadenas seul se confond
                  avec celui des fonctions absentes de l'offre, qui, elles,
                  restent cliquables et mènent à un écran qui les explique. */}
              <span className="flex-1 line-through">{item.label}</span>
              <Lock className="w-3.5 h-3.5 shrink-0" />
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={isLocked ? "Non comprise dans votre offre" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-brand-blue text-white"
                : isLocked
                  ? "text-slate-400 hover:bg-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-brand-blue"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {isLocked && <Lock className="w-3.5 h-3.5 shrink-0" />}
          </Link>
        );
      })}

      <Link
        href="/pos"
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-brand-gold text-white hover:bg-brand-gold-dark transition-colors"
      >
        <ScanLine className="w-4 h-4 shrink-0" />
        Ouvrir la caisse
      </Link>
    </nav>
  );
}

/** Menu latéral, visible en grand écran uniquement (dans le <aside>). */
export function AdminSidebarNav({
  role,
  locked,
  unpaid,
}: {
  role: string;
  locked: string[];
  unpaid?: boolean;
}) {
  return <NavLinks role={role} locked={locked} unpaid={unpaid} />;
}

/** Bouton flottant + tiroir, pour mobile et tablette. */
export function AdminMobileNav({
  role,
  locked,
  unpaid,
}: {
  role: string;
  locked: string[];
  unpaid?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-brand-blue text-white p-3.5 rounded-full shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white w-72 max-w-[85%] h-full p-4 overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="font-display font-bold text-brand-blue mb-6 pr-8">
              Back-office
            </p>
            <NavLinks
              role={role}
              locked={locked}
              unpaid={unpaid}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
