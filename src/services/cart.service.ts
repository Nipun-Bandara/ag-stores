import { getDb } from "@/db";
import { CatalogStatus } from "@/generated/prisma/client";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
  multiplyMinorUnits,
} from "@/lib/money";
import {
  PrismaCartRepository,
  type CartRepository,
} from "@/repositories/cart.repository";
import type { CartValidationInput } from "@/validations/cart";

export class CartValidationError extends Error {
  constructor(
    public readonly code: "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK",
    message: string,
  ) {
    super(message);
    this.name = "CartValidationError";
  }
}

function getCartRepository(): CartRepository {
  return new PrismaCartRepository(getDb());
}

export async function validateCartForCheckout(
  input: CartValidationInput,
  repository: CartRepository = getCartRepository(),
) {
  const products = await repository.findProductsByIds(
    input.items.map((item) => item.productId),
  );
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  let subtotal = "0";

  const items = input.items.map((item) => {
    const product = productsById.get(item.productId);
    if (
      !product ||
      !product.isAvailable ||
      product.category.status !== CatalogStatus.ACTIVE ||
      product.stockQuantity === 0
    ) {
      throw new CartValidationError(
        "PRODUCT_UNAVAILABLE",
        "A product in your cart is no longer available.",
      );
    }
    if (item.quantity > product.stockQuantity) {
      throw new CartValidationError(
        "INSUFFICIENT_STOCK",
        `${product.nameEn} only has ${product.stockQuantity} available.`,
      );
    }

    const unitPrice = product.price.toFixed(2);
    const lineTotal = multiplyMinorUnits(
      moneyToMinorUnits(unitPrice),
      item.quantity,
    );
    subtotal = addMinorUnits(subtotal, lineTotal);
    return {
      productId: product.id,
      name: product.nameEn,
      quantity: item.quantity,
      unitPrice,
      lineTotal: minorUnitsToMoney(lineTotal),
      stockQuantity: product.stockQuantity,
    };
  });

  const shopIds = new Set(products.map((product) => product.shop.id));
  const deliveryFee =
    shopIds.size === 1
      ? (products[0]?.shop.deliveryFee.toFixed(2) ?? null)
      : null;

  return { items, subtotal: minorUnitsToMoney(subtotal), deliveryFee };
}
