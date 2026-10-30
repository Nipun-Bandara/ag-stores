// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  PrismaCheckoutRepository,
  type CheckoutOrderData,
} from "@/repositories/checkout.repository";

const data: CheckoutOrderData = {
  customerId: "customer-id",
  shopId: "shop-id",
  deliveryAddressId: "address-id",
  subtotal: "100.00",
  deliveryFee: "50.00",
  total: "150.00",
  customerNote: null,
  items: [{ productId: "product-id", quantity: 1, unitPrice: "100.00" }],
};

function setup() {
  const transaction = {
    order: {
      create: vi.fn().mockResolvedValue({ id: "order-id" }),
      findUniqueOrThrow: vi.fn(),
    },
  };
  const runTransaction = vi.fn(async (operation) => operation(transaction));
  const prisma = { $transaction: runTransaction } as unknown as PrismaClient;
  return {
    transaction,
    runTransaction,
    repository: new PrismaCheckoutRepository(prisma),
  };
}

describe("checkout order creation", () => {
  it("loads the confirmation after creating the order and nested items", async () => {
    const { transaction, repository, runTransaction } = setup();
    const confirmation = {
      id: "order-id",
      shop: { name: "Shop" },
      deliveryAddress: { label: "Home", address: "1 Main Street" },
      items: [{ productId: "product-id", quantity: 1 }],
    };
    transaction.order.findUniqueOrThrow.mockResolvedValue(confirmation);

    const result = await repository.transaction((tx) => tx.createOrder(data));

    expect(result).toBe(confirmation);
    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(transaction.order.create).toHaveBeenCalledWith({
      data: { ...data, items: { create: data.items } },
      select: { id: true },
    });
    expect(transaction.order.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "order-id" },
      select: expect.objectContaining({
        shop: expect.any(Object),
        deliveryAddress: expect.any(Object),
        items: expect.any(Object),
      }),
    });
    expect(transaction.order.create.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.order.findUniqueOrThrow.mock.invocationCallOrder[0]!,
    );
  });

  it("fails the transaction if the confirmation cannot be loaded", async () => {
    const { transaction, repository } = setup();
    const failure = new Error("Order confirmation unavailable");
    transaction.order.findUniqueOrThrow.mockRejectedValue(failure);

    await expect(
      repository.transaction((tx) => tx.createOrder(data)),
    ).rejects.toBe(failure);
  });
});
