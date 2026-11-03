import {
  calculatePricing,
  validatePricing,
  type DiscountTier,
} from "@/lib/pricing";
import {
  firstOrderQuantity,
  quantityValid,
  stepQuantity,
  type SellingUnit,
} from "@/lib/quantity";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";

export interface CartProduct {
  id: string;
  name: string;
  nameEn?: string;
  nameSi?: string | null;
  price: string;
  discountTiers?: DiscountTier[];
  sellingUnit?: SellingUnit;
  minimumOrderQuantity?: number;
  orderingIncrement?: number;
  stockQuantity: number;
  imageUrl: string | null;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; product: CartProduct }
  | { type: "update"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

export const emptyCartState: CartState = { items: [] };

export function isValidCartItem(item: CartItem): boolean {
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    /^\d+\.\d{2}$/.test(item.price) &&
    Number.isFinite(item.stockQuantity) &&
    item.stockQuantity > 0 &&
    quantityValid(item.quantity, item) &&
    item.quantity <= item.stockQuantity &&
    (item.imageUrl === null || typeof item.imageUrl === "string")
  );
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return {
        items: action.items.filter(isValidCartItem).map((item) => {
          try {
            validatePricing(item.price, item.discountTiers ?? [], item);
            return item;
          } catch {
            return { ...item, discountTiers: [] };
          }
        }),
      };
    case "add": {
      if (action.product.stockQuantity < firstOrderQuantity(action.product))
        return state;
      const existing = state.items.find(
        (item) => item.id === action.product.id,
      );
      if (existing) {
        // Weight is entered explicitly; repeated adds must not invent a weight increment.
        if (action.product.sellingUnit === "KG") return state;
        if (
          (existing.sellingUnit ?? "UNIT") !==
          (action.product.sellingUnit ?? "UNIT")
        )
          return state;
        const nextQuantity = stepQuantity(
          existing.quantity,
          action.product.orderingIncrement ?? 1,
        );
        if (
          nextQuantity > action.product.stockQuantity ||
          !quantityValid(nextQuantity, action.product)
        )
          return state;
        return {
          items: state.items.map((item) =>
            item.id === action.product.id
              ? {
                  ...item,
                  ...action.product,
                  quantity: nextQuantity,
                }
              : item,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            ...action.product,
            quantity: firstOrderQuantity(action.product),
          },
        ],
      };
    }
    case "update":
      if (
        !state.items.some(
          (item) =>
            item.id === action.productId &&
            action.quantity <= item.stockQuantity &&
            quantityValid(action.quantity, item),
        )
      ) {
        return state;
      }
      return {
        items: state.items.map((item) =>
          item.id === action.productId && action.quantity <= item.stockQuantity
            ? { ...item, quantity: action.quantity }
            : item,
        ),
      };
    case "remove":
      if (!state.items.some((item) => item.id === action.productId))
        return state;
      return {
        items: state.items.filter((item) => item.id !== action.productId),
      };
    case "clear":
      return emptyCartState;
  }
}

export function getCartItemCount(state: CartState): number {
  return state.items.length;
}

export function getCartSubtotal(state: CartState): string {
  const minorUnits = state.items.reduce(
    (total, item) =>
      addMinorUnits(
        total,
        moneyToMinorUnits(
          calculatePricing(item.price, item.quantity, item.discountTiers ?? [])
            .lineTotal,
        ),
      ),
    "0",
  );
  return minorUnitsToMoney(minorUnits);
}
