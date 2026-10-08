import {
  DeliveryBatchStatus,
  OrderStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import {
  type AuditEntry,
  writeAuditLog,
} from "@/repositories/audit-write.repository";
import { createNotifications } from "@/repositories/notification-write.repository";
import type { NotificationCreateRecord } from "@/services/order-notification.service";

const batchOrderSelect = {
  id: true,
  customerId: true,
  shopId: true,
  status: true,
  batchAssignment: { select: { batchId: true } },
} satisfies Prisma.OrderSelect;

export type BatchCandidateOrder = Prisma.OrderGetPayload<{
  select: typeof batchOrderSelect;
}>;

export interface CreatedDeliveryBatch {
  id: string;
  deliveryPersonId: string;
  status: DeliveryBatchStatus;
  createdAt: Date;
}

export interface DeliveryBatchTransaction {
  findAssignedShopId(deliveryPersonId: string): Promise<string | null>;
  lockOrders(orderIds: readonly string[]): Promise<void>;
  findOrders(orderIds: readonly string[]): Promise<BatchCandidateOrder[]>;
  createBatch(deliveryPersonId: string): Promise<CreatedDeliveryBatch>;
  updateOrdersToAssigned(orderIds: readonly string[]): Promise<number>;
  createAssignments(
    batchId: string,
    orderIds: readonly string[],
  ): Promise<void>;
  createStatusHistory(input: {
    orderIds: readonly string[];
    changedById: string;
    createdAt: Date;
    note: string;
  }): Promise<void>;
  createNotifications(
    notifications: readonly NotificationCreateRecord[],
  ): Promise<void>;
  writeAudits(entries: readonly AuditEntry[]): Promise<void>;
}

export interface DeliveryBatchRepository {
  transaction<T>(
    operation: (transaction: DeliveryBatchTransaction) => Promise<T>,
  ): Promise<T>;
}

class PrismaDeliveryBatchTransaction implements DeliveryBatchTransaction {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async findAssignedShopId(deliveryPersonId: string): Promise<string | null> {
    const person = await this.prisma.user.findUnique({
      where: { id: deliveryPersonId },
      select: { assignedShopId: true },
    });
    return person?.assignedShopId ?? null;
  }

  async lockOrders(orderIds: readonly string[]): Promise<void> {
    const identifiers = [...orderIds]
      .sort()
      .map((orderId) => Prisma.sql`${orderId}::uuid`);
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT "id" FROM "orders" WHERE "id" IN (${Prisma.join(identifiers)}) ORDER BY "id" FOR UPDATE`,
    );
  }

  findOrders(orderIds: readonly string[]): Promise<BatchCandidateOrder[]> {
    return this.prisma.order.findMany({
      where: { id: { in: [...orderIds] } },
      select: batchOrderSelect,
    });
  }

  createBatch(deliveryPersonId: string): Promise<CreatedDeliveryBatch> {
    return this.prisma.deliveryBatch.create({
      data: { deliveryPersonId },
      select: {
        id: true,
        deliveryPersonId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateOrdersToAssigned(orderIds: readonly string[]): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: {
        id: { in: [...orderIds] },
        status: OrderStatus.READY_FOR_DELIVERY,
        batchAssignment: null,
      },
      data: { status: OrderStatus.ASSIGNED },
    });
    return result.count;
  }

  async createAssignments(
    batchId: string,
    orderIds: readonly string[],
  ): Promise<void> {
    await this.prisma.deliveryBatchOrder.createMany({
      data: orderIds.map((orderId, index) => ({
        batchId,
        orderId,
        sequence: index + 1,
      })),
    });
  }

  async createStatusHistory(input: {
    orderIds: readonly string[];
    changedById: string;
    createdAt: Date;
    note: string;
  }): Promise<void> {
    await this.prisma.orderStatusHistory.createMany({
      data: input.orderIds.map((orderId) => ({
        orderId,
        fromStatus: OrderStatus.READY_FOR_DELIVERY,
        toStatus: OrderStatus.ASSIGNED,
        changedById: input.changedById,
        createdAt: input.createdAt,
        note: input.note,
      })),
    });
  }

  createNotifications(
    notifications: readonly NotificationCreateRecord[],
  ): Promise<void> {
    return createNotifications(this.prisma, notifications);
  }

  async writeAudits(entries: readonly AuditEntry[]): Promise<void> {
    for (const entry of entries) await writeAuditLog(this.prisma, entry);
  }
}

export class PrismaDeliveryBatchRepository implements DeliveryBatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  transaction<T>(
    operation: (transaction: DeliveryBatchTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      (transaction) =>
        operation(new PrismaDeliveryBatchTransaction(transaction)),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}

export function isDeliveryBatchConflictError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}
