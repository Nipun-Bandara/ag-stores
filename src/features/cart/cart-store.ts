"use client";

import { useSyncExternalStore } from "react";

import {
  cartReducer,
  emptyCartState,
  getCartItemCount,
  getCartSubtotal,
  type CartProduct,
  type CartState,
} from "@/features/cart/cart-state";

const LEGACY_STORAGE_KEY = "ag-stores-cart-v1";
const STORAGE_PREFIX = "ag-stores-cart-v2:";
const listeners = new Set<() => void>();
let state = emptyCartState;
let loaded = false;
let ownerId: string | null = null;

function storageKey(): string | null {
  return ownerId ? `${STORAGE_PREFIX}${ownerId}` : null;
}

function loadState(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const key = storageKey();
  if (!key) return;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      stored &&
      typeof stored === "object" &&
      "items" in stored &&
      Array.isArray(stored.items)
    ) {
      state = cartReducer(state, { type: "hydrate", items: stored.items });
    }
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Keep the cart usable in memory when browser storage is unavailable.
    }
  }
}

function commit(nextState: CartState): void {
  state = nextState;
  const key = storageKey();
  if (typeof window !== "undefined" && key) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Keep the cart usable in memory when browser storage is unavailable.
    }
  }
  listeners.forEach((listener) => listener());
}

function update(action: Parameters<typeof cartReducer>[1]): boolean {
  loadState();
  const nextState = cartReducer(state, action);
  if (nextState === state) return false;
  commit(nextState);
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartState {
  loadState();
  return state;
}

function getServerSnapshot(): CartState {
  return emptyCartState;
}

export const cartStore = {
  setOwner(userId: string | null) {
    if (ownerId === userId) return;
    ownerId = userId;
    state = emptyCartState;
    loaded = false;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Storage may be unavailable; the in-memory cart still works.
      }
      loadState();
    }
    listeners.forEach((listener) => listener());
  },
  add(product: CartProduct) {
    return update({ type: "add", product });
  },
  updateQuantity(productId: string, quantity: number) {
    return update({ type: "update", productId, quantity });
  },
  remove(productId: string) {
    return update({ type: "remove", productId });
  },
  clear() {
    return update({ type: "clear" });
  },
};

export function useCart() {
  const currentState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return {
    ...currentState,
    itemCount: getCartItemCount(currentState),
    subtotal: getCartSubtotal(currentState),
    ...cartStore,
  };
}
