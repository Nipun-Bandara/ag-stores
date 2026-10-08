import { getDb } from "@/db";
import { CatalogStatus } from "@/generated/prisma/client";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
  multiplyMinorUnits,
} from "@/lib/money";
import {
  PrismaCheckoutRepository,
  type CheckoutRepository,
  type OrderConfirmationRecord,
  type ReservedProductRecord,
} from "@/repositories/checkout.repository";
import { calculateDistance } from "@/services/geographic-distance.service";
import type { AuthenticatedUser } from "@/types/auth";
import type { CheckoutInput } from "@/validations/checkout";

type CheckoutErrorCode =
  | "CUSTOMER_ONLY"
  | "EMPTY_CART"
  | "ADDRESS_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "MULTIPLE_SHOPS"
  | "SHOP_INACTIVE"
  | "SHOP_CLOSED"
  | "MINIMUM_ORDER_NOT_MET"
  | "OUTSIDE_DELIVERY_RADIUS"
  | "ORDER_NOT_FOUND";

export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

function getCheckoutRepository(): CheckoutRepository {
  return new PrismaCheckoutRepository(getDb());
}

function assertCustomer(user: AuthenticatedUser): void {
  if (user.role !== "CUSTOMER") {
    throw new CheckoutError(
      "CUSTOMER_ONLY",
      "Customer access is required.",
      403,
    );
  }
}

function toOrderView(order: OrderConfirmationRecord) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    shopName: order.shop.name,
    deliveryAddress: order.deliveryAddress,
    subtotal: order.subtotal.toFixed(2),
    deliveryFee: order.deliveryFee.toFixed(2),
    total: order.total.toFixed(2),
    deliveryInstructions: order.customerNote,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.product.nameEn,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: minorUnitsToMoney(
        multiplyMinorUnits(
          moneyToMinorUnits(item.unitPrice.toFixed(2)),
          item.quantity,
        ),
      ),
    })),
  };
}

export type OrderConfirmationView = ReturnType<typeof toOrderView>;

export async function checkout(
  user: AuthenticatedUser,
  input: CheckoutInput,
  repository: CheckoutRepository = getCheckoutRepository(),
): Promise<OrderConfirmationView> {
  assertCustomer(user);
  if (input.items.length === 0) {
    throw new CheckoutError("EMPTY_CART", "Your cart is empty.", 400);
  }

  return repository.transaction(async (transaction) => {
    const deliveryAddress = await transaction.findOwnedAddress(
      user.id,
      input.deliveryAddressId,
    );
    if (!deliveryAddress) {
      throw new CheckoutError(
        "ADDRESS_NOT_FOUND",
        "Select one of your saved delivery addresses.",
        404,
      );
    }

    const reservedProducts: Array<{
      product: ReservedProductRecord;
      quantity: number;
    }> = [];
    const sortedItems = [...input.items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    );
    for (const item of sortedItems) {
      const product = await transaction.reserveProduct(
        item.productId,
        item.quantity,
      );
      if (!product) {
        const current = await transaction.findProduct(item.productId);
        if (
          !current ||
          !current.isAvailable ||
          current.stockQuantity === 0 ||
          !current.shop.isActive ||
          current.category.status !== CatalogStatus.ACTIVE
        ) {
          throw new CheckoutError(
            "PRODUCT_UNAVAILABLE",
            "A product in your cart is no longer available.",
            409,
          );
        }
        throw new CheckoutError(
          "INSUFFICIENT_STOCK",
          `${current.nameEn} only has ${current.stockQuantity} available.`,
          409,
        );
      }
      reservedProducts.push({ product, quantity: item.quantity });
    }

    const shopIds = new Set(
      reservedProducts.map(({ product }) => product.shopId),
    );
    if (shopIds.size !== 1) {
      throw new CheckoutError(
        "MULTIPLE_SHOPS",
        "Items from different shops must be checked out separately.",
        409,
      );
    }

    let subtotalMinor = "0";
    const orderItems = reservedProducts.map(({ product, quantity }) => {
      const unitPrice = product.price.toFixed(2);
      subtotalMinor = addMinorUnits(
        subtotalMinor,
        multiplyMinorUnits(moneyToMinorUnits(unitPrice), quantity),
      );
      return { productId: product.id, quantity, unitPrice };
    });
    const subtotal = minorUnitsToMoney(subtotalMinor);
    const shopId = reservedProducts[0]?.product.shopId ?? "";
    const shop = await transaction.findShopSettings(shopId);
    if (!shop || !shop.isActive) {
      throw new CheckoutError(
        "SHOP_INACTIVE",
        "This shop is not currently available.",
        409,
      );
    }
    if (!shop.isOpen) {
      throw new CheckoutError(
        "SHOP_CLOSED",
        "This shop is currently closed and cannot accept orders.",
        409,
      );
    }
    if (
      BigInt(subtotalMinor) <
      BigInt(moneyToMinorUnits(shop.minimumOrderAmount.toFixed(2)))
    ) {
      throw new CheckoutError(
        "MINIMUM_ORDER_NOT_MET",
        `The minimum order amount is LKR ${shop.minimumOrderAmount.toFixed(2)}.`,
        409,
      );
    }
    const distanceKm = calculateDistance(
      shop.latitude.toNumber(),
      shop.longitude.toNumber(),
      deliveryAddress.latitude.toNumber(),
      deliveryAddress.longitude.toNumber(),
    );
    if (distanceKm > shop.maximumDeliveryRadiusKm.toNumber()) {
      throw new CheckoutError(
        "OUTSIDE_DELIVERY_RADIUS",
        `The selected address is outside this shop's ${shop.maximumDeliveryRadiusKm.toFixed(2)} km delivery radius.`,
        409,
      );
    }
    const deliveryFee = shop.deliveryFee.toFixed(2);
    const total = minorUnitsToMoney(
      addMinorUnits(subtotalMinor, moneyToMinorUnits(deliveryFee)),
    );
    const order = await transaction.createOrder({
      customerId: user.id,
      shopId,
      deliveryAddressId: input.deliveryAddressId,
      subtotal,
      deliveryFee,
      total,
      customerNote: input.deliveryInstructions || null,
      items: orderItems,
    });
    return toOrderView(order);
  });
}

export async function getCustomerOrder(
  user: AuthenticatedUser,
  orderId: string,
  repository: CheckoutRepository = getCheckoutRepository(),
): Promise<OrderConfirmationView> {
  assertCustomer(user);
  const order = await repository.findOrderForCustomer(user.id, orderId);
  if (!order) {
    throw new CheckoutError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return toOrderView(order);
}
