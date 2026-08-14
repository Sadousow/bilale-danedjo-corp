import Link from "next/link";
import { Rocket, Package, Palette, Store } from "lucide-react";

import { publishShopAction } from "@/app/admin/publication-actions";

/**
 * Premiers pas, affiché tant que la vitrine n'est pas publiée.
 *
 * Il tient lieu de mise en route : un marchand qui arrive sur un back-office
 * vide ne sait pas par où commencer, et les trois liens ci-dessous sont
 * exactement l'ordre dans lequel il faut s'y prendre.
 */
export default function PublishBanner({
  productCount,
  hasLogo,
}: {
  productCount: number;
  hasLogo: boolean;
}) {
  const steps = [
    {
      done: productCount > 0,
      href: "/admin/produits/nouveau",
      icon: Package,
      label: "Ajouter vos produits",
      hint:
        productCount > 0
          ? `${productCount} produit${productCount > 1 ? "s" : ""} au catalogue`
          : "Votre catalogue est vide",
    },
    {
      done: hasLogo,
      href: "/admin/apparence",
      icon: Palette,
      label: "Mettre votre logo et vos couleurs",
      hint: hasLogo ? "Logo en place" : "Aucun logo pour l'instant",
    },
    {
      done: false,
      href: "/admin/parametres",
      icon: Store,
      label: "Vérifier vos coordonnées",
      hint: "Téléphone, adresse, horaires",
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-5">
      <div className="flex items-start gap-3">
        <Rocket className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="font-semibold text-brand-blue">
            Votre boutique n&apos;est pas encore ouverte au public
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Prenez le temps de la préparer : personne ne peut la voir tant que
            vous ne l&apos;avez pas publiée. Vous pourrez tout modifier après.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid sm:grid-cols-3 gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex items-start gap-2.5 h-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 hover:border-brand-blue transition-colors"
              >
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    step.done ? "text-brand-gold-dark" : "text-slate-400"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {step.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {step.hint}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={publishShopAction} className="mt-4">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
        >
          <Rocket className="w-4 h-4" />
          Ouvrir ma boutique au public
        </button>
        <span className="ml-3 text-xs text-slate-600">
          Vous pourrez la refermer à tout moment depuis les paramètres.
        </span>
      </form>
    </div>
  );
}
