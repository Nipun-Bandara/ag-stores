import { calculatePricing, tierViews } from "@/lib/pricing";
import { quantityValid } from "@/lib/quantity";
import { getDb } from "@/db";
import { CatalogStatus } from "@/generated/prisma/client";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import {
  PrismaCartRepository,
  type CartRepository,
} from "@/repositories/cart.repository";
import type { CartValidationInput } from "@/validations/cart";

export class CartValidationError extends Error {
  constructor(
    public readonly code:
      "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "INVALID_QUANTITY",
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
      Number(product.stockQuantity) === 0
    ) {
      throw new CartValidationError(
        "PRODUCT_UNAVAILABLE",
        "A product in your cart is no longer available.",
      );
    }
    if (item.quantity > Number(product.stockQuantity)) {
      throw new CartValidationError(
        "INSUFFICIENT_STOCK",
        `${product.nameEn} only has ${product.stockQuantity} available.`,
      );
    }

    if (
      !quantityValid(item.quantity, product) ||
      (item.sellingUnit ?? "UNIT") !== product.sellingUnit
    ) {
      throw new CartValidationError(
        "INVALID_QUANTITY",
        "Product selling setup changed. Review your cart quantity and unit.",
      );
    }
    const discountTiers = tierViews(product.discountTiers);
    const pricing = calculatePricing(
      product.price.toFixed(2),
      item.quantity,
      discountTiers,
    );
    subtotal = addMinorUnits(subtotal, moneyToMinorUnits(pricing.lineTotal));
    return {
      productId: product.id,
      name: product.nameEn,
      nameSi: product.nameSi,
      quantity: item.quantity,
      ...pricing,
      discountTiers,
      minimumOrderQuantity: Number(product.minimumOrderQuantity),
      orderingIncrement: Number(product.orderingIncrement),
      stockQuantity: Number(product.stockQuantity),
      sellingUnit: product.sellingUnit,
    };
  });

  const shopIds = new Set(products.map((product) => product.shop.id));
  const deliveryFee =
    shopIds.size === 1
      ? (products[0]?.shop.deliveryFee.toFixed(2) ?? null)
      : null;

  return { items, subtotal: minorUnitsToMoney(subtotal), deliveryFee };
}

export type CartQuote = Awaited<ReturnType<typeof validateCartForCheckout>>;
