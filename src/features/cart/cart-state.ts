import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
  multiplyMinorUnits,
} from "@/lib/money";

export interface CartProduct {
  id: string;
  name: string;
  price: string;
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
    Number.isInteger(item.stockQuantity) &&
    item.stockQuantity > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= item.stockQuantity &&
    (item.imageUrl === null || typeof item.imageUrl === "string")
  );
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items.filter(isValidCartItem) };
    case "add": {
      if (action.product.stockQuantity < 1) return state;
      const existing = state.items.find(
        (item) => item.id === action.product.id,
      );
      if (existing) {
        if (existing.quantity >= action.product.stockQuantity) return state;
        return {
          items: state.items.map((item) =>
            item.id === action.product.id
              ? {
                  ...item,
                  ...action.product,
                  quantity: item.quantity + 1,
                }
              : item,
          ),
        };
      }
      return { items: [...state.items, { ...action.product, quantity: 1 }] };
    }
    case "update":
      if (!Number.isInteger(action.quantity) || action.quantity < 1) {
        return state;
      }
      if (
        !state.items.some(
          (item) =>
            item.id === action.productId &&
            action.quantity <= item.stockQuantity,
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
  return state.items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(state: CartState): string {
  const minorUnits = state.items.reduce(
    (total, item) =>
      addMinorUnits(
        total,
        multiplyMinorUnits(moneyToMinorUnits(item.price), item.quantity),
      ),
    "0",
  );
  return minorUnitsToMoney(minorUnits);
}
