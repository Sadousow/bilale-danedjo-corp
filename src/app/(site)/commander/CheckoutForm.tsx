"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Banknote, Lock, ShieldCheck, Smartphone } from "lucide-react";

import { useCart } from "@/components/shop/cart";
import { formatPrice } from "@/lib/format";
import { deliveryFeeFor } from "@/lib/orders";
import { placeOrderAction } from "./actions";

export type Zone = {
  id: string;
  name: string;
  fee: number;
  freeAbove: number;
  delay: string;
};

export type Prefill = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

export default function CheckoutForm({
  zones,
  prefill,
  onlinePaymentAvailable,
  minOrderAmount,
  loggedIn,
}: {
  zones: Zone[];
  prefill: Prefill;
  onlinePaymentAvailable: boolean;
  minOrderAmount: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const { lines, subtotal, ready, clear } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: prefill.name,
    phone: prefill.phone,
    email: prefill.email,
    address: prefill.address,
    notes: "",
    zoneId: zones[0]?.id ?? "",
    paymentMethod: "A_LA_LIVRAISON" as "A_LA_LIVRAISON" | "EN_LIGNE",
  });

  useEffect(() => {
    if (ready && lines.length === 0 && !pending) {
      router.replace("/panier");
    }
  }, [ready, lines.length, pending, router]);

  const zone = useMemo(
    () => zones.find((z) => z.id === form.zoneId) ?? null,
    [zones, form.zoneId]
  );

  const deliveryFee = deliveryFeeFor(zone, subtotal);
  const total = subtotal + deliveryFee;
  const belowMinimum = minOrderAmount > 0 && subtotal < minOrderAmount;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);

    if (!form.zoneId) {
      setError("Choisissez une zone de livraison.");
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction({
        lines: lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes,
        zoneId: form.zoneId,
        paymentMethod: form.paymentMethod,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      clear();

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      router.push(`/commande/${result.id}`);
    });
  }

  if (!ready) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">Chargement…</div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-6">
        {/* Coordonnées */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
            Vos coordonnées
          </h2>

          {!loggedIn && (
            <p className="mb-4 text-sm text-slate-500">
              Vous avez déjà un compte ?{" "}
              <Link href="/compte?suivant=/commander" className="text-brand-blue hover:underline">
                Connectez-vous
              </Link>{" "}
              pour retrouver vos informations.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="name">
                Nom complet *
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={input}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={label} htmlFor="phone">
                Téléphone *
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={input}
                placeholder="624 39 03 32"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="email">
                Email (facultatif)
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={input}
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="address">
                Adresse de livraison *
              </label>
              <textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className={input}
                placeholder="Quartier, repère, immeuble…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="notes">
                Instructions pour le livreur (facultatif)
              </label>
              <input
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className={input}
                placeholder="Appeler avant d'arriver, portail bleu…"
              />
            </div>
          </div>
        </section>

        {/* Livraison */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
            Zone de livraison
          </h2>

          {zones.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune zone de livraison n&apos;est configurée. Contactez-nous par
              WhatsApp pour finaliser votre commande.
            </p>
          ) : (
            <div className="space-y-2">
              {zones.map((z) => {
                const fee = deliveryFeeFor(z, subtotal);
                const selected = form.zoneId === z.id;
                return (
                  <label
                    key={z.id}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      selected
                        ? "border-brand-blue bg-brand-blue/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone"
                      checked={selected}
                      onChange={() => update("zoneId", z.id)}
                      className="w-4 h-4 accent-brand-blue"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-slate-800">
                        {z.name}
                      </span>
                      {z.delay && (
                        <span className="block text-xs text-slate-500">
                          {z.delay}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {fee === 0 ? "Offerte" : formatPrice(fee)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* Paiement */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
            Paiement
          </h2>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                form.paymentMethod === "A_LA_LIVRAISON"
                  ? "border-brand-blue bg-brand-blue/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={form.paymentMethod === "A_LA_LIVRAISON"}
                onChange={() => update("paymentMethod", "A_LA_LIVRAISON")}
                className="w-4 h-4 mt-0.5 accent-brand-blue"
              />
              <Banknote className="w-5 h-5 text-slate-400 mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Paiement à la livraison
                </span>
                <span className="block text-xs text-slate-500">
                  Espèces ou Mobile Money au moment de la remise du colis.
                </span>
              </span>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                !onlinePaymentAvailable
                  ? "border-slate-200 opacity-50 cursor-not-allowed"
                  : form.paymentMethod === "EN_LIGNE"
                    ? "border-brand-blue bg-brand-blue/5 cursor-pointer"
                    : "border-slate-200 hover:border-slate-300 cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name="payment"
                disabled={!onlinePaymentAvailable}
                checked={form.paymentMethod === "EN_LIGNE"}
                onChange={() => update("paymentMethod", "EN_LIGNE")}
                className="w-4 h-4 mt-0.5 accent-brand-blue"
              />
              <Smartphone className="w-5 h-5 text-slate-400 mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Payer maintenant en ligne
                </span>
                <span className="block text-xs text-slate-500">
                  Orange Money, MTN MoMo, carte bancaire — paiement sécurisé.
                </span>
                {!onlinePaymentAvailable && (
                  <span className="block text-xs text-amber-700 mt-1">
                    Bientôt disponible.
                  </span>
                )}
              </span>
            </label>
          </div>

          {form.paymentMethod === "EN_LIGNE" && (
            <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              Vous serez redirigé vers la page de paiement sécurisée de notre
              prestataire, puis ramené ici automatiquement.
            </p>
          )}
        </section>
      </div>

      {/* Récapitulatif */}
      <div className="lg:col-span-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-brand-blue mb-4">
            Votre commande
          </h2>

          <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.sku} className="flex gap-3 items-center">
                <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-white">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{line.name}</p>
                  <p className="text-xs text-slate-500">
                    {line.quantity} × {formatPrice(line.price)}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-800 shrink-0">
                  {formatPrice(line.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 text-sm border-t border-slate-200 pt-4">
            <div className="flex justify-between">
              <dt className="text-slate-600">Sous-total</dt>
              <dd className="text-slate-800">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Livraison</dt>
              <dd className="text-slate-800">
                {deliveryFee === 0 ? "Offerte" : formatPrice(deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <dt className="font-semibold text-slate-800">Total</dt>
              <dd className="text-xl font-bold text-brand-blue">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          {error && (
            <p className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={pending || belowMinimum || zones.length === 0}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-3.5 rounded-md transition-colors"
          >
            <Lock className="w-4 h-4" />
            {pending
              ? "Validation…"
              : form.paymentMethod === "EN_LIGNE"
                ? `Payer ${formatPrice(total)}`
                : "Confirmer la commande"}
          </button>

          <Link
            href="/panier"
            className="mt-3 block text-center text-sm text-slate-500 hover:text-brand-blue"
          >
            ← Modifier mon panier
          </Link>
        </div>
      </div>
    </div>
  );
}
