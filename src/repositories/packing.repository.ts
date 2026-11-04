import {
  AuditAction,
  AuditEntityType,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";
import { writeAuditLog } from "@/repositories/audit-write.repository";

const packingOrderSelect = {
  id: true,
  customerId: true,
  shopId: true,
  status: true,
  packingRequired: true,
  packingVersion: true,
  subtotal: true,
  total: true,
  deliveryFee: true,
  shop: { select: { ownerId: true, weightDifferenceAllowancePct: true } },
  items: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      productId: true,
      quantity: true,
      sellingUnit: true,
      unitPrice: true,
      packedQuantity: true,
      contactAgreedAt: true,
      contactNote: true,
    },
  },
} satisfies Prisma.OrderSelect;
export type PackingOrderRecord = Prisma.OrderGetPayload<{
  select: typeof packingOrderSelect;
}>;

export interface PackingTransaction {
  findLockedOrder(orderId: string): Promise<PackingOrderRecord | null>;
  reconcileStock(productId: string, difference: string): Promise<boolean>;
  updateItem(
    itemId: string,
    packedQuantity: string,
    contact: { at: Date; note: string } | null,
  ): Promise<void>;
  updateOrder(
    orderId: string,
    expectedVersion: number,
    subtotal: string,
    total: string,
  ): Promise<boolean>;
  audit(
    actorId: string,
    orderId: string,
    metadata: Record<string, unknown>,
  ): Promise<void>;
}
export interface PackingRepository {
  transaction<T>(
    operation: (transaction: PackingTransaction) => Promise<T>,
  ): Promise<T>;
}

class PrismaPackingTransaction implements PackingTransaction {
  constructor(private readonly prisma: Prisma.TransactionClient) {}
  async findLockedOrder(orderId: string): Promise<PackingOrderRecord | null> {
    await this.prisma
      .$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: packingOrderSelect,
    });
  }
  async reconcileStock(
    productId: string,
    difference: string,
  ): Promise<boolean> {
    const amount = new Prisma.Decimal(difference);
    if (amount.isZero()) return true;
    const updated = await this.prisma.product.updateMany({
      where: {
        id: productId,
        ...(amount.isPositive() ? { stockQuantity: { gte: amount } } : {}),
      },
      data: {
        stockQuantity: amount.isPositive()
          ? { decrement: amount }
          : { increment: amount.negated() },
      },
    });
    return updated.count === 1;
  }
  async updateItem(
    itemId: string,
    packedQuantity: string,
    contact: { at: Date; note: string } | null,
  ): Promise<void> {
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        packedQuantity,
        contactAgreedAt: contact?.at ?? null,
        contactNote: contact?.note ?? null,
        contactWeight: contact ? packedQuantity : null,
      },
    });
  }
  async updateOrder(
    orderId: string,
    expectedVersion: number,
    subtotal: string,
    total: string,
  ): Promise<boolean> {
    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: "PREPARING",
        packingVersion: expectedVersion,
      },
      data: { subtotal, total, packingVersion: { increment: 1 } },
    });
    return result.count === 1;
  }
  async audit(
    actorId: string,
    orderId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await writeAuditLog(this.prisma, {
      actorId,
      entityId: orderId,
      entityType: AuditEntityType.ORDER,
      action: AuditAction.ORDER_PACKING_UPDATED,
      metadata,
    });
  }
}
export class PrismaPackingRepository implements PackingRepository {
  constructor(private readonly prisma: PrismaClient) {}
  transaction<T>(
    operation: (transaction: PackingTransaction) => Promise<T>,
  ): Promise<T> {
    return withSerializableRetry(() =>
      this.prisma.$transaction(
        (transaction) => operation(new PrismaPackingTransaction(transaction)),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10_000,
          timeout: 30_000,
        },
      ),
    );
  }
}
