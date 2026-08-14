"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, RefreshCw, Smartphone, X } from "lucide-react";

/**
 * Aperçu de la vitrine, dans un cadre.
 *
 * C'est la vraie page — même mise en page, mêmes produits, mêmes couleurs —
 * chargée sur `?apercu=1`, qui sert le brouillon aux administrateurs. Rien
 * n'est réimplémenté ici, donc rien ne peut diverger de la boutique réelle.
 */

const WIDTHS = { ordinateur: 1280, telephone: 390 } as const;
type Device = keyof typeof WIDTHS;

export default function PreviewPanel({
  shopUrl,
  /** Change à chaque enregistrement de brouillon : déclenche le rechargement. */
  version,
  pending,
  fullscreen = false,
  onClose,
}: {
  shopUrl: string;
  version: number;
  pending: boolean;
  fullscreen?: boolean;
  onClose?: () => void;
}) {
  const [device, setDevice] = useState<Device>("ordinateur");
  const [box, setBox] = useState({ scale: 1, height: 900 });
  const [loading, setLoading] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  const width = WIDTHS[device];

  /*
   * Le cadre rend à taille réelle puis on le réduit : une vitrine dessinée
   * pour 1280 px doit être jugée à 1280 px, pas à 400 — sinon les points de
   * rupture de Tailwind basculent en version mobile et l'aperçu ment.
   *
   * La hauteur est divisée par l'échelle pour qu'après réduction le cadre
   * occupe exactement la place disponible.
   */
  useEffect(() => {
    const element = holder.current;
    if (!element) return;

    const fit = () => {
      const scale = Math.min(1, element.clientWidth / width);
      setBox({ scale, height: element.clientHeight / scale });
    };
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  // Recharger le cadre plutôt que changer sa `src` : l'URL ne bouge pas, donc
  // React ne remonterait pas l'iframe — et le marchand perdrait sa position
  // de défilement à chaque frappe.
  //
  // L'effet ne fait que déclencher le rechargement ; l'indicateur d'attente
  // vient de `pending` et de `onLoad`, pas d'un setState posé ici.
  useEffect(() => {
    if (version === 0) return;
    frame.current?.contentWindow?.location.reload();
  }, [version]);

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-slate-100 flex flex-col"
          : "flex flex-col h-full bg-slate-100 border border-slate-200 rounded-xl overflow-hidden"
      }
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shrink-0">
        <span className="text-sm font-medium text-slate-700 mr-auto">
          Aperçu
          {pending && (
            <span className="ml-2 text-xs font-normal text-amber-600">
              mise à jour…
            </span>
          )}
        </span>

        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setDevice("ordinateur")}
            aria-label="Aperçu ordinateur"
            title="Ordinateur"
            className={`p-1.5 ${
              device === "ordinateur"
                ? "bg-brand-blue text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("telephone")}
            aria-label="Aperçu téléphone"
            title="Téléphone"
            className={`p-1.5 ${
              device === "telephone"
                ? "bg-brand-blue text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            frame.current?.contentWindow?.location.reload();
          }}
          aria-label="Actualiser l'aperçu"
          title="Actualiser"
          className="p-1.5 text-slate-500 hover:text-brand-blue"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading || pending ? "animate-spin" : ""}`}
          />
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="p-1.5 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div ref={holder} className="flex-1 overflow-hidden relative">
        <iframe
          ref={frame}
          // `?apercu=1` : la vitrine sert alors le brouillon — mais seulement
          // à un administrateur connecté sur cette boutique.
          src={`${shopUrl}/?apercu=1`}
          title="Aperçu de la boutique"
          onLoad={() => setLoading(false)}
          className="border-0 bg-white"
          style={{
            width,
            height: box.height,
            transform: `scale(${box.scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
