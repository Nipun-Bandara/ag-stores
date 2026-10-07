import {
  Prisma,
  type OrderStatus,
  type PrismaClient,
} from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";

const orderTransitionSelect = {
  id: true,
  customerId: true,
  status: true,
  shop: { select: { ownerId: true } },
  batchAssignment: {
    select: { batch: { select: { deliveryPersonId: true } } },
  },
  items: { select: { productId: true, quantity: true } },
} satisfies Prisma.OrderSelect;

export type OrderTransitionRecord = Prisma.OrderGetPayload<{
  select: typeof orderTransitionSelect;
}>;

export interface OrderStatusTransaction {
  findOrder(orderId: string): Promise<OrderTransitionRecord | null>;
  updateStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    cancellation: { at: Date; reason: string | null } | null,
  ): Promise<boolean>;
  createHistory(input: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    note: string | null;
    createdAt: Date;
  }): Promise<{ id: string; createdAt: Date }>;
  restoreStock(
    items: ReadonlyArray<{ productId: string; quantity: number }>,
  ): Promise<void>;
}

export interface OrderStatusRepository {
  transaction<T>(
    operation: (transaction: OrderStatusTransaction) => Promise<T>,
  ): Promise<T>;
}

class PrismaOrderStatusTransaction implements OrderStatusTransaction {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  findOrder(orderId: string): Promise<OrderTransitionRecord | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderTransitionSelect,
    });
  }

  async updateStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    cancellation: { at: Date; reason: string | null } | null,
  ): Promise<boolean> {
    const result = await this.prisma.order.updateMany({
      where: { id: orderId, status: expectedStatus },
      data: {
        status: nextStatus,
        ...(cancellation
          ? {
              cancelledAt: cancellation.at,
              cancellationReason: cancellation.reason,
            }
          : {}),
      },
    });
    return result.count === 1;
  }

  createHistory(input: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    note: string | null;
    createdAt: Date;
  }): Promise<{ id: string; createdAt: Date }> {
    return this.prisma.orderStatusHistory.create({
      data: input,
      select: { id: true, createdAt: true },
    });
  }

  async restoreStock(
    items: ReadonlyArray<{ productId: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }
}

export class PrismaOrderStatusRepository implements OrderStatusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async transaction<T>(
    operation: (transaction: OrderStatusTransaction) => Promise<T>,
  ): Promise<T> {
    return withSerializableRetry(() =>
      this.prisma.$transaction(
        (prismaTransaction) =>
          operation(new PrismaOrderStatusTransaction(prismaTransaction)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }
}
