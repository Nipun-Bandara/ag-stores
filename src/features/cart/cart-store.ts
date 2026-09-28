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

const STORAGE_KEY = "ag-stores-cart-v1";
const listeners = new Set<() => void>();
let state = emptyCartState;
let loaded = false;

function loadState(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (
      stored &&
      typeof stored === "object" &&
      "items" in stored &&
      Array.isArray(stored.items)
    ) {
      state = cartReducer(state, { type: "hydrate", items: stored.items });
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function commit(nextState: CartState): void {
  state = nextState;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
