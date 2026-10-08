import { describe, expect, it, vi } from "vitest";

import {
  OrderStatus,
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type {
  OrderStatusRepository,
  OrderStatusTransaction,
  OrderTransitionRecord,
} from "@/repositories/order-status.repository";
import {
  OrderStatusServiceError,
  transitionOrderStatus,
} from "@/services/order-status.service";
import type { AuthenticatedUser } from "@/types/auth";

const orderId = "87d9a0e2-8e03-4c30-8377-fb41062017f2";
const customerId = "9965b2c6-6da9-49fd-9b52-655158116faf";
const ownerId = "4a59ce72-4c66-4880-8aeb-7dfaa7e2975f";
const shopId = "5ce3aa64-d571-4337-a06e-58c11b5b3130";

function user(id: string, role: UserRole): AuthenticatedUser {
  return {
    id,
    role,
    name: "Test actor",
    email: "actor@example.test",
    phone: null,
    preferredLanguage: PreferredLanguage.EN,
    status: UserStatus.ACTIVE,
  };
}

function order(
  status: OrderStatus = OrderStatus.PLACED,
): OrderTransitionRecord {
  return {
    id: orderId,
    customerId,
    shopId,
    status,
    shop: { ownerId },
    batchAssignment: null,
    items: [{ productId: "4d4fd014-a88d-4b6a-a557-f5822d64299d", quantity: 2 }],
  };
}

function repositoryFor(record: OrderTransitionRecord | null) {
  const transaction = {
    findOrder: vi.fn(async () => record),
    updateStatus: vi.fn(async () => true),
    createHistory: vi.fn(async () => ({
      id: "8a430274-76f0-4999-9f86-a32b37823daf",
      createdAt: new Date("2026-09-28T12:00:00.000Z"),
    })),
    restoreStock: vi.fn(async () => undefined),
    findActiveDeliveryPersonIds: vi.fn(async () => []),
    createNotifications: vi.fn(async () => undefined),
  } satisfies OrderStatusTransaction;
  const repository: OrderStatusRepository = {
    transaction: async (operation) => operation(transaction),
  };
  return { repository, transaction };
}

describe("order status service", () => {
  it("updates status and records timestamped history atomically", async () => {
    const { repository, transaction } = repositoryFor(order());
    const result = await transitionOrderStatus(
      user(ownerId, UserRole.SHOP_OWNER),
      orderId,
      OrderStatus.CONFIRMED,
      "Accepted by shop",
      repository,
    );

    expect(transaction.updateStatus).toHaveBeenCalledWith(
      orderId,
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      null,
    );
    expect(transaction.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        fromStatus: OrderStatus.PLACED,
        toStatus: OrderStatus.CONFIRMED,
        changedById: ownerId,
        note: "Accepted by shop",
        createdAt: expect.any(Date),
      }),
    );
    expect(transaction.restoreStock).not.toHaveBeenCalled();
    expect(result).toEqual({
      orderId,
      previousStatus: OrderStatus.PLACED,
      status: OrderStatus.CONFIRMED,
      changedAt: "2026-09-28T12:00:00.000Z",
    });
  });

  it("stores customer cancellation details and restores reserved stock", async () => {
    const record = order();
    const { repository, transaction } = repositoryFor(record);

    const result = await transitionOrderStatus(
      user(customerId, UserRole.CUSTOMER),
      orderId,
      OrderStatus.CANCELLED,
      "  Ordered by mistake  ",
      repository,
    );

    expect(transaction.updateStatus).toHaveBeenCalledWith(
      orderId,
      OrderStatus.PLACED,
      OrderStatus.CANCELLED,
      {
        at: expect.any(Date),
        reason: "Ordered by mistake",
      },
    );
    expect(transaction.restoreStock).toHaveBeenCalledWith(record.items);
    expect(transaction.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        fromStatus: OrderStatus.PLACED,
        toStatus: OrderStatus.CANCELLED,
        changedById: customerId,
        note: "Ordered by mistake",
        createdAt: expect.any(Date),
      }),
    );
    expect(result).toMatchObject({
      orderId,
      previousStatus: OrderStatus.PLACED,
      status: OrderStatus.CANCELLED,
      cancelledAt: expect.any(String),
      cancellationReason: "Ordered by mistake",
    });
  });

  it("rejects an otherwise valid transition by an actor outside the order scope", async () => {
    const { repository, transaction } = repositoryFor(order());

    await expect(
      transitionOrderStatus(
        user("eed7424e-2c92-4b69-adab-ac2688763749", UserRole.SHOP_OWNER),
        orderId,
        OrderStatus.CONFIRMED,
        undefined,
        repository,
      ),
    ).rejects.toMatchObject<Partial<OrderStatusServiceError>>({
      code: "ORDER_ACCESS_DENIED",
      status: 403,
    });
    expect(transaction.updateStatus).not.toHaveBeenCalled();
    expect(transaction.createHistory).not.toHaveBeenCalled();
  });

  it("rejects a valid transition when the actor role is not authorized", async () => {
    const { repository, transaction } = repositoryFor(order());

    await expect(
      transitionOrderStatus(
        user(customerId, UserRole.CUSTOMER),
        orderId,
        OrderStatus.CONFIRMED,
        undefined,
        repository,
      ),
    ).rejects.toMatchObject<Partial<OrderStatusServiceError>>({
      code: "UNAUTHORIZED_ORDER_TRANSITION",
      status: 403,
    });
    expect(transaction.updateStatus).not.toHaveBeenCalled();
    expect(transaction.createHistory).not.toHaveBeenCalled();
  });

  it("rejects an invalid lifecycle transition", async () => {
    const { repository, transaction } = repositoryFor(
      order(OrderStatus.DELIVERED),
    );

    await expect(
      transitionOrderStatus(
        user(ownerId, UserRole.SHOP_OWNER),
        orderId,
        OrderStatus.PREPARING,
        undefined,
        repository,
      ),
    ).rejects.toMatchObject<Partial<OrderStatusServiceError>>({
      code: "INVALID_ORDER_TRANSITION",
      status: 409,
    });
    expect(transaction.updateStatus).not.toHaveBeenCalled();
    expect(transaction.createHistory).not.toHaveBeenCalled();
  });

  it("returns not found without attempting a write", async () => {
    const { repository, transaction } = repositoryFor(null);

    await expect(
      transitionOrderStatus(
        user(ownerId, UserRole.SHOP_OWNER),
        orderId,
        OrderStatus.CONFIRMED,
        undefined,
        repository,
      ),
    ).rejects.toMatchObject<Partial<OrderStatusServiceError>>({
      code: "ORDER_NOT_FOUND",
      status: 404,
    });
    expect(transaction.updateStatus).not.toHaveBeenCalled();
    expect(transaction.createHistory).not.toHaveBeenCalled();
  });

  it("rejects a concurrent status change without writing history", async () => {
    const { repository, transaction } = repositoryFor(order());
    transaction.updateStatus.mockResolvedValue(false);

    await expect(
      transitionOrderStatus(
        user(ownerId, UserRole.SHOP_OWNER),
        orderId,
        OrderStatus.CONFIRMED,
        undefined,
        repository,
      ),
    ).rejects.toMatchObject<Partial<OrderStatusServiceError>>({
      code: "ORDER_CHANGED",
      status: 409,
    });
    expect(transaction.createHistory).not.toHaveBeenCalled();
  });
});
