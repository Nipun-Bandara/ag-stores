import {
  DeliveryBatchStatus,
  OrderStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

const activeBatchListSelect = {
  id: true,
  status: true,
  createdAt: true,
  startedAt: true,
  _count: { select: { orders: true } },
  orders: {
    select: { order: { select: { status: true } } },
  },
} satisfies Prisma.DeliveryBatchSelect;

const batchDetailSelect = {
  id: true,
  deliveryPersonId: true,
  status: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  orders: {
    orderBy: { sequence: "asc" as const },
    select: {
      sequence: true,
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          customerNote: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
          deliveryAddress: {
            select: {
              label: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          _count: { select: { items: true } },
        },
      },
    },
  },
} satisfies Prisma.DeliveryBatchSelect;

const lifecycleBatchSelect = {
  id: true,
  deliveryPersonId: true,
  status: true,
  orders: {
    orderBy: { sequence: "asc" as const },
    select: {
      sequence: true,
      order: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.DeliveryBatchSelect;

export type ActiveBatchListRecord = Prisma.DeliveryBatchGetPayload<{
  select: typeof activeBatchListSelect;
}>;
export type DeliveryBatchDetailRecord = Prisma.DeliveryBatchGetPayload<{
  select: typeof batchDetailSelect;
}>;
export type DeliveryBatchLifecycleRecord = Prisma.DeliveryBatchGetPayload<{
  select: typeof lifecycleBatchSelect;
}>;

export interface DeliveryBatchManagementTransaction {
  lockBatch(batchId: string): Promise<void>;
  lockOrders(orderIds: readonly string[]): Promise<void>;
  findOwnedBatch(
    deliveryPersonId: string,
    batchId: string,
  ): Promise<DeliveryBatchLifecycleRecord | null>;
  updateSequences(batchId: string, orderIds: readonly string[]): Promise<void>;
  startBatch(batchId: string, startedAt: Date): Promise<boolean>;
  startOrders(batchId: string): Promise<number>;
  createStartHistory(input: {
    orderIds: readonly string[];
    changedById: string;
    createdAt: Date;
  }): Promise<void>;
  updateOrderStatus(input: {
    batchId: string;
    orderId: string;
    expectedStatus: OrderStatus;
    nextStatus: OrderStatus;
  }): Promise<boolean>;
  createOrderHistory(input: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    note: string | null;
    createdAt: Date;
  }): Promise<void>;
  countUnfinishedOrders(batchId: string): Promise<number>;
  completeBatch(batchId: string, completedAt: Date): Promise<boolean>;
}

export interface DeliveryBatchManagementRepository {
  findActive(deliveryPersonId: string): Promise<ActiveBatchListRecord[]>;
  findOwnedDetail(
    deliveryPersonId: string,
    batchId: string,
  ): Promise<DeliveryBatchDetailRecord | null>;
  transaction<T>(
    operation: (transaction: DeliveryBatchManagementTransaction) => Promise<T>,
  ): Promise<T>;
}

class PrismaDeliveryBatchManagementTransaction implements DeliveryBatchManagementTransaction {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async lockBatch(batchId: string): Promise<void> {
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT "id" FROM "delivery_batches" WHERE "id" = ${batchId}::uuid FOR UPDATE`,
    );
  }

  async lockOrders(orderIds: readonly string[]): Promise<void> {
    const identifiers = [...orderIds]
      .sort()
      .map((orderId) => Prisma.sql`${orderId}::uuid`);
    if (identifiers.length === 0) return;
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT "id" FROM "orders" WHERE "id" IN (${Prisma.join(identifiers)}) ORDER BY "id" FOR UPDATE`,
    );
  }

  findOwnedBatch(
    deliveryPersonId: string,
    batchId: string,
  ): Promise<DeliveryBatchLifecycleRecord | null> {
    return this.prisma.deliveryBatch.findFirst({
      where: { id: batchId, deliveryPersonId },
      select: lifecycleBatchSelect,
    });
  }

  async updateSequences(
    batchId: string,
    orderIds: readonly string[],
  ): Promise<void> {
    await this.prisma.deliveryBatchOrder.updateMany({
      where: { batchId },
      data: { sequence: { increment: orderIds.length } },
    });
    for (const [index, orderId] of orderIds.entries()) {
      await this.prisma.deliveryBatchOrder.update({
        where: { batchId_orderId: { batchId, orderId } },
        data: { sequence: index + 1 },
      });
    }
  }

  async startBatch(batchId: string, startedAt: Date): Promise<boolean> {
    const result = await this.prisma.deliveryBatch.updateMany({
      where: { id: batchId, status: DeliveryBatchStatus.PENDING },
      data: { status: DeliveryBatchStatus.IN_PROGRESS, startedAt },
    });
    return result.count === 1;
  }

  async startOrders(batchId: string): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: {
        status: OrderStatus.ASSIGNED,
        batchAssignment: { batchId },
      },
      data: { status: OrderStatus.OUT_FOR_DELIVERY },
    });
    return result.count;
  }

  async createStartHistory(input: {
    orderIds: readonly string[];
    changedById: string;
    createdAt: Date;
  }): Promise<void> {
    await this.prisma.orderStatusHistory.createMany({
      data: input.orderIds.map((orderId) => ({
        orderId,
        fromStatus: OrderStatus.ASSIGNED,
        toStatus: OrderStatus.OUT_FOR_DELIVERY,
        changedById: input.changedById,
        createdAt: input.createdAt,
        note: "Delivery batch started.",
      })),
    });
  }

  async updateOrderStatus(input: {
    batchId: string;
    orderId: string;
    expectedStatus: OrderStatus;
    nextStatus: OrderStatus;
  }): Promise<boolean> {
    const result = await this.prisma.order.updateMany({
      where: {
        id: input.orderId,
        status: input.expectedStatus,
        batchAssignment: { batchId: input.batchId },
      },
      data: { status: input.nextStatus },
    });
    return result.count === 1;
  }

  async createOrderHistory(input: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    note: string | null;
    createdAt: Date;
  }): Promise<void> {
    await this.prisma.orderStatusHistory.create({ data: input });
  }

  countUnfinishedOrders(batchId: string): Promise<number> {
    return this.prisma.deliveryBatchOrder.count({
      where: {
        batchId,
        order: {
          status: {
            notIn: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY],
          },
        },
      },
    });
  }

  async completeBatch(batchId: string, completedAt: Date): Promise<boolean> {
    const result = await this.prisma.deliveryBatch.updateMany({
      where: { id: batchId, status: DeliveryBatchStatus.IN_PROGRESS },
      data: { status: DeliveryBatchStatus.COMPLETED, completedAt },
    });
    return result.count === 1;
  }
}

export class PrismaDeliveryBatchManagementRepository implements DeliveryBatchManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActive(deliveryPersonId: string): Promise<ActiveBatchListRecord[]> {
    return this.prisma.deliveryBatch.findMany({
      where: {
        deliveryPersonId,
        status: {
          in: [DeliveryBatchStatus.PENDING, DeliveryBatchStatus.IN_PROGRESS],
        },
      },
      orderBy: { createdAt: "desc" },
      select: activeBatchListSelect,
    });
  }

  findOwnedDetail(
    deliveryPersonId: string,
    batchId: string,
  ): Promise<DeliveryBatchDetailRecord | null> {
    return this.prisma.deliveryBatch.findFirst({
      where: { id: batchId, deliveryPersonId },
      select: batchDetailSelect,
    });
  }

  transaction<T>(
    operation: (transaction: DeliveryBatchManagementTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      (transaction) =>
        operation(new PrismaDeliveryBatchManagementTransaction(transaction)),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
