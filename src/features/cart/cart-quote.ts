import type { CartItem } from "./cart-state";

/** Price metadata is deliberately excluded: applying a quote must not create a request loop. */
export function cartSelectionKey(items: readonly CartItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
      sellingUnit: item.sellingUnit ?? "UNIT",
    })),
  );
}
