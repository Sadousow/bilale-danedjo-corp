"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Le panier est propre à chaque boutique : sur un même navigateur, deux
 * sous-domaines ne doivent jamais partager leur contenu.
 */
const STORAGE_KEY = `bdc_panier_v1_${
  typeof window === "undefined" ? "" : window.location.host
}`;

export type CartLine = {
  /** Référence produit (SKU) — c'est elle qui fait foi côté serveur. */
  sku: string;
  name: string;
  /** Prix d'affichage uniquement : le serveur recalcule à la commande. */
  price: number;
  image: string;
  unit?: string;
  quantity: number;
};

/**
 * Le panier vit dans le navigateur. On l'expose via un store externe plutôt
 * qu'un état React : `useSyncExternalStore` gère proprement l'hydratation
 * (panier vide côté serveur, contenu réel une fois monté) sans provoquer
 * de divergence de rendu.
 */

const EMPTY: CartLine[] = [];

let state: CartLine[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const lines = parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).sku === "string" &&
        typeof (l as CartLine).quantity === "number" &&
        (l as CartLine).quantity > 0
    );
    return lines.length ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota dépassé ou navigation privée : on ignore
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: CartLine[]) {
  state = next;
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  // Première souscription : c'est le moment où l'on peut lire le stockage
  // sans risquer une divergence avec le rendu serveur.
  if (!hydrated) {
    hydrated = true;
    state = readStorage();
  }

  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      state = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getLines = () => state;
const getServerLines = () => EMPTY;
const getHydrated = () => hydrated;
const getServerHydrated = () => false;

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getLines, getServerLines);
  const ready = useSyncExternalStore(subscribe, getHydrated, getServerHydrated);

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      const existing = state.find((l) => l.sku === line.sku);
      setState(
        existing
          ? state.map((l) =>
              l.sku === line.sku ? { ...l, quantity: l.quantity + quantity } : l
            )
          : [...state, { ...line, quantity }]
      );
    },
    []
  );

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setState(
      state
        .map((l) => (l.sku === sku ? { ...l, quantity: Math.max(0, quantity) } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setState(state.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => setState([]), []);

  const totals = useMemo(
    () => ({
      count: lines.reduce((acc, l) => acc + l.quantity, 0),
      subtotal: lines.reduce((acc, l) => acc + l.price * l.quantity, 0),
    }),
    [lines]
  );

  return { lines, ready, ...totals, add, setQuantity, remove, clear };
}
