"use client";
import { useEffect, useState } from "react";
import type { CartItem } from "./cart-state";
import { cartStore } from "./cart-store";
import { cartSelectionKey } from "./cart-quote";
import type { CartQuote } from "@/services/cart.service";

export function useCartQuote(items: readonly CartItem[]) {
  const selectionKey = cartSelectionKey(items);
  const [revision, setRevision] = useState(0);
  const key = `${selectionKey}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    data?: CartQuote;
    error?: string;
  }>();
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    if (selectionKey === "[]") return;
    const controller = new AbortController();
    let active = true;
    void fetch("/api/checkout/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: JSON.parse(selectionKey) }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: CartQuote;
          error?: { message?: string };
        };
        // Check after JSON as well: an aborted fetch may already have resolved its headers.
        if (!active) return;
        if (
          !response.ok ||
          !payload.data ||
          !Array.isArray(payload.data.items)
        ) {
          setResult({
            key,
            error: payload.error?.message ?? "Unable to validate the cart.",
          });
          return;
        }
        const data = payload.data;
        const quotedKey = JSON.stringify(
          data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            sellingUnit: item.sellingUnit,
          })),
        );
        if (quotedKey !== selectionKey) {
          setResult({
            key,
            error: "The cart changed. Please review it and try again.",
          });
          return;
        }
        cartStore.updateFromQuote(selectionKey, data);
        setResult({ key, data });
      })
      .catch(() => {
        if (active) setResult({ key, error: "Unable to validate the cart." });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectionKey, key]);
  const current = result?.key === key ? result : undefined;
  return {
    quote: current?.data,
    quoteError: current?.error,
    quotePending: items.length > 0 && !current,
  };
}
