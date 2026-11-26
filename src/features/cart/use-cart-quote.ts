"use client";
import { useEffect, useState } from "react";
import type { CartItem } from "./cart-state";
import { cartStore } from "./cart-store";
import { cartSelectionKey } from "./cart-quote";
import type { CartQuote } from "@/services/cart.service";
import { calculatePricing } from "@/lib/pricing";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";

export function useCartQuote(
  items: readonly CartItem[],
  mode: "selection" | "products" = "selection",
) {
  const selectionKey = cartSelectionKey(items);
  // Cart editing reuses the initially fetched rates; checkout validates each selection.
  const [result, setResult] = useState<{
    key: string;
    data?: CartQuote;
    error?: string;
  }>();
  const reuseProducts =
    mode === "products" &&
    result?.data &&
    items.every((item) =>
      result.data?.items.some(
        (line) =>
          line.productId === item.id &&
          line.sellingUnit === (item.sellingUnit ?? "UNIT"),
      ),
    );
  const key = reuseProducts
    ? result.key
    : mode === "products"
      ? JSON.stringify(
          items.map((item) => [item.id, item.sellingUnit ?? "UNIT"]),
        )
      : selectionKey;
  const completedKey = mode === "products" ? result?.key : undefined;
  useEffect(() => {
    if (selectionKey === "[]") return;
    if (completedKey === key) return;
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
  }, [selectionKey, key, completedKey]);
  const current = result?.key === key ? result : undefined;
  let quote = current?.data;
  if (mode === "products" && quote) {
    let subtotal = "0";
    const lines = quote.items
      .filter((line) => items.some((item) => item.id === line.productId))
      .map((line) => {
        const quantity =
          items.find((item) => item.id === line.productId)?.quantity ??
          line.quantity;
        const pricing = calculatePricing(
          line.regularPrice,
          quantity,
          line.discountTiers,
        );
        subtotal = addMinorUnits(
          subtotal,
          moneyToMinorUnits(pricing.lineTotal),
        );
        return { ...line, quantity, ...pricing };
      });
    quote = { ...quote, items: lines, subtotal: minorUnitsToMoney(subtotal) };
  }
  return {
    quote,
    quoteError: current?.error,
    quotePending: items.length > 0 && !current,
  };
}
