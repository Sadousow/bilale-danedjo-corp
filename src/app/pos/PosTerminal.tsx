"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { formatPrice, ticketNumber } from "@/lib/format";
import {
  checkoutAction,
  createCustomerFromPos,
  type CheckoutInput,
} from "./actions";

export type PosProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string | null;
  categoryKey: string;
  categoryLabel: string;
};

export type PosCustomer = {
  id: string;
  name: string;
  creditBalance: number;
};

type CartItem = { product: PosProduct; quantity: number };

type Method = CheckoutInput["method"];

const methods: { value: Method; label: string }[] = [
  { value: "ESPECES", label: "Espèces" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MTN_MOMO", label: "MTN MoMo" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CREDIT", label: "Crédit client" },
];

export default function PosTerminal({
  products,
  customers: initialCustomers,
}: {
  products: PosProduct[];
  customers: PosCustomer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<Method>("ESPECES");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    saleId: string;
    number: number;
    change: number;
    due: number;
  } | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.categoryKey, p.categoryLabel));
    return [...map.entries()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.categoryKey !== category) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, category]);

  const subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const total = subtotal - safeDiscount;
  const paidNumber = Number(paid.replace(/\s/g, "")) || 0;
  const isCredit = method === "CREDIT";
  const change = isCredit ? 0 : Math.max(0, paidNumber - total);
  const due = isCredit ? Math.max(0, total - paidNumber) : 0;

  function addToCart(product: PosProduct) {
    setError(null);
    setCart((current) => {
      const existing = current.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Stock maximum atteint pour « ${product.name} ».`);
          return current;
        }
        return current.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stock < 1) {
        setError(`« ${product.name} » est en rupture de stock.`);
        return current;
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current
        .map((i) => {
          if (i.product.id !== productId) return i;
          const capped = Math.min(Math.max(0, quantity), i.product.stock);
          return { ...i, quantity: capped };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function resetSale() {
    setCart([]);
    setDiscount(0);
    setPaid("");
    setNote("");
    setCustomerId("");
    setMethod("ESPECES");
    setError(null);
    setSuccess(null);
    searchRef.current?.focus();
  }

  function submit() {
    setError(null);

    if (cart.length === 0) {
      setError("Le panier est vide.");
      return;
    }
    if (!isCredit && paidNumber < total) {
      setError("Le montant reçu est inférieur au total à payer.");
      return;
    }
    if (isCredit && !customerId) {
      setError("Choisissez un client pour une vente à crédit.");
      return;
    }

    startTransition(async () => {
      const result = await checkoutAction({
        lines: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        discount: safeDiscount,
        method,
        paid: paidNumber,
        customerId: customerId || null,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess({
        saleId: result.saleId,
        number: result.number,
        change: result.change,
        due: result.due,
      });
      setCart([]);
      setDiscount(0);
      setPaid("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
      {/* Catalogue */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-3 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock < 1}
              className="text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-blue hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <p className="font-medium text-sm text-slate-800 line-clamp-2 min-h-[2.5rem]">
                {p.name}
              </p>
              <p className="mt-2 font-bold text-brand-blue">
                {formatPrice(p.price)}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  p.stock < 1
                    ? "text-red-500"
                    : p.stock <= 5
                      ? "text-amber-600"
                      : "text-slate-400"
                }`}
              >
                {p.stock < 1 ? "Rupture" : `${p.stock} en stock`}
              </p>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-16 text-slate-400 text-sm">
            Aucun produit ne correspond à cette recherche.
          </p>
        )}
      </div>

      {/* Panier */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:sticky lg:top-4 flex flex-col max-h-[calc(100vh-2rem)]">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Panier
              {cart.length > 0 && (
                <span className="bg-brand-blue text-white text-xs rounded-full px-2 py-0.5">
                  {cart.length}
                </span>
              )}
            </h2>
            {cart.length > 0 && (
              <button
                onClick={resetSale}
                className="text-xs text-slate-400 hover:text-red-600 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center py-10 px-4 text-sm text-slate-400">
                Touchez un produit pour l&apos;ajouter au panier.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <li key={item.product.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 flex-1">
                        {item.product.name}
                      </p>
                      <button
                        onClick={() => setQuantity(item.product.id, 0)}
                        className="text-slate-300 hover:text-red-600"
                        aria-label="Retirer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setQuantity(item.product.id, Number(e.target.value))
                          }
                          className="w-14 h-8 text-center border border-slate-200 rounded-md text-sm"
                        />
                        <button
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Sous-total</span>
              <span className="text-slate-700">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor="discount" className="text-slate-500 shrink-0">
                Remise (GNF)
              </label>
              <input
                id="discount"
                type="number"
                min={0}
                max={subtotal}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-28 px-2 py-1.5 border border-slate-200 rounded-md text-right text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-800">Total</span>
              <span className="text-2xl font-bold text-brand-blue">
                {formatPrice(total)}
              </span>
            </div>

            <div>
              <label
                htmlFor="method"
                className="block text-xs font-medium text-slate-500 mb-1"
              >
                Mode de paiement
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm bg-white"
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="customer"
                    className="block text-xs font-medium text-slate-500"
                  >
                    Client {isCredit ? "(obligatoire)" : "(facultatif)"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(true)}
                    className="text-xs text-brand-blue hover:underline inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Nouveau
                  </button>
                </div>
                <select
                  id="customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm bg-white"
                >
                  <option value="">— Aucun —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.creditBalance > 0
                        ? ` (doit ${formatPrice(c.creditBalance)})`
                        : ""}
                    </option>
                  ))}
                </select>
            </div>

            <div>
              <label
                htmlFor="paid"
                className="block text-xs font-medium text-slate-500 mb-1"
              >
                {isCredit ? "Acompte versé" : "Montant reçu"}
              </label>
              <input
                id="paid"
                inputMode="numeric"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={String(total)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-lg font-semibold text-right"
              />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[total, 50000, 100000, 500000].map((amount, i) => (
                  <button
                    key={`${amount}-${i}`}
                    type="button"
                    onClick={() =>
                      setPaid(String(i === 0 ? total : paidNumber + amount))
                    }
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                  >
                    {i === 0 ? "Appoint" : `+${formatPrice(amount)}`}
                  </button>
                ))}
              </div>
            </div>

            {change > 0 && (
              <div className="flex items-center justify-between text-sm bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                <span className="text-emerald-700">Monnaie à rendre</span>
                <span className="font-bold text-emerald-700">
                  {formatPrice(change)}
                </span>
              </div>
            )}
            {due > 0 && (
              <div className="flex items-center justify-between text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <span className="text-amber-800">Reste à crédit</span>
                <span className="font-bold text-amber-800">{formatPrice(due)}</span>
              </div>
            )}

            {error && (
              <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={pending || cart.length === 0}
              className="w-full bg-brand-gold hover:bg-brand-gold-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg text-base transition-colors"
            >
              {pending ? "Validation…" : `Encaisser ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h2 className="mt-4 font-display text-xl font-bold text-slate-800">
              Vente enregistrée
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ticket {ticketNumber(success.number)}
            </p>

            {success.change > 0 && (
              <p className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <span className="block text-xs text-emerald-700">
                  Monnaie à rendre
                </span>
                <span className="block text-2xl font-bold text-emerald-700">
                  {formatPrice(success.change)}
                </span>
              </p>
            )}
            {success.due > 0 && (
              <p className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <span className="block text-xs text-amber-800">
                  Montant porté au crédit
                </span>
                <span className="block text-2xl font-bold text-amber-800">
                  {formatPrice(success.due)}
                </span>
              </p>
            )}

            <div className="mt-6 space-y-2">
              <a
                href={`/pos/ticket/${success.saleId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg text-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimer le reçu
              </a>
              <button
                onClick={resetSale}
                className="w-full bg-brand-blue hover:bg-brand-blue-light text-white font-semibold py-3 rounded-lg"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau client */}
      {showNewCustomer && (
        <NewCustomerDialog
          onClose={() => setShowNewCustomer(false)}
          onCreated={(customer) => {
            setCustomers((c) =>
              c.some((x) => x.id === customer.id) ? c : [...c, customer]
            );
            setCustomerId(customer.id);
            setShowNewCustomer(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: PosCustomer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6">
        <h2 className="font-display text-lg font-bold text-slate-800 mb-4">
          Nouveau client
        </h2>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet *"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-md text-sm"
          >
            Annuler
          </button>
          <button
            disabled={pending || !name.trim()}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await createCustomerFromPos(name, phone);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                onCreated(result.customer);
              })
            }
            className="flex-1 bg-brand-blue text-white py-2.5 rounded-md text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
