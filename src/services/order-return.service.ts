import { getDb } from "@/db";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { quantityMilli, quantityNumber } from "@/lib/quantity";
import {
  moneyToMinorUnits,
  minorUnitsToMoney,
  multiplyMinorUnits,
} from "@/lib/money";
import { withSerializableRetry } from "@/lib/db-transaction";
import {
  productPageInfo,
  type ProductPageRequest,
} from "@/lib/product-pagination";
import { writeAuditLog } from "@/repositories/audit-write.repository";
import type { AuthenticatedUser } from "@/types/auth";
import {
  recordReturnSchema,
  returnActionSchema,
  type RecordReturnInput,
  type ReturnActionInput,
} from "@/validations/order-return";

export class ReturnError extends Error {
  constructor(
    readonly message: string,
    readonly status = 409,
  ) {
    super(message);
  }
}
export function returnOrderScope(
  actor: AuthenticatedUser,
): Prisma.OrderWhereInput {
  if (actor.role === "SHOP_OWNER") return { shop: { ownerId: actor.id } };
  if (actor.role === "ORDER_STAFF" && actor.assignedShopId)
    return { shopId: actor.assignedShopId };
  if (actor.role === "ADMIN") return {};
  throw new ReturnError("You cannot access order returns.", 403);
}

export async function getOrderReturns(
  actor: AuthenticatedUser,
  orderId: string,
  database?: PrismaClient,
) {
  const scope = returnOrderScope(actor);
  const db = database ?? getDb();
  const order = await db.order.findFirst({
    where: { id: orderId, ...scope },
    select: { id: true },
  });
  if (!order) throw new ReturnError("Order not found.", 404);
  const rows = await db.orderReturn.findMany({
    where: { orderId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    refundAmount: row.refundAmount.toFixed(2),
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    refundPaidAt: row.refundPaidAt?.toISOString() ?? null,
  }));
}
export type OrderReturnView = Awaited<
  ReturnType<typeof getOrderReturns>
>[number];

export async function getReturnQueue(
  actor: AuthenticatedUser,
  request: ProductPageRequest,
  status: "PENDING" | "APPROVED" | "REJECTED",
  database?: PrismaClient,
) {
  const scope = returnOrderScope(actor);
  const db = database ?? getDb();
  const where = { order: scope, status };
  const total = await db.orderReturn.count({ where });
  const pagination = productPageInfo(total, request);
  const records = await db.orderReturn.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
    include: {
      order: {
        select: {
          customer: { select: { name: true } },
          shop: { select: { name: true } },
        },
      },
      orderItem: {
        select: {
          product: { select: { nameEn: true, nameSi: true } },
          sellingUnit: true,
        },
      },
    },
  });
  return {
    ...pagination,
    records: records.map((record) => ({
      ...record,
      quantity: Number(record.quantity),
      refundAmount: record.refundAmount.toFixed(2),
    })),
  };
}

/** Pending returns reserve quantities and refund value until approved or rejected. */
export function returnAmounts(input: {
  quantity: string;
  deliveredQuantity: string;
  sellingUnit: string;
  unitPrice: string;
  reserved: { quantity: string; refundAmount: string }[];
}) {
  const quantity = quantityMilli(input.quantity);
  if (
    quantity <= BigInt(0) ||
    (input.sellingUnit === "UNIT" && quantity % BigInt(1000) !== BigInt(0))
  )
    throw new ReturnError("Enter a valid return quantity.", 400);
  const used = input.reserved.reduce(
    (sum, row) => sum + quantityMilli(row.quantity),
    BigInt(0),
  );
  if (used + quantity > quantityMilli(input.deliveredQuantity))
    throw new ReturnError(
      "Return quantity exceeds the remaining delivered quantity.",
    );
  const price = moneyToMinorUnits(input.unitPrice);
  const lineTotal = BigInt(
    multiplyMinorUnits(price, Number(input.deliveredQuantity)),
  );
  const reservedRefund = input.reserved.reduce(
    (sum, row) => sum + BigInt(moneyToMinorUnits(row.refundAmount)),
    BigInt(0),
  );
  const remainingRefund = lineTotal - reservedRefund;
  const requestedRefund =
    used + quantity === quantityMilli(input.deliveredQuantity)
      ? remainingRefund
      : BigInt(multiplyMinorUnits(price, quantityNumber(quantity)));
  if (remainingRefund < BigInt(0))
    throw new ReturnError("Return refund totals are inconsistent.");
  return {
    quantity: new Prisma.Decimal(input.quantity),
    refundAmount: minorUnitsToMoney(
      (requestedRefund < remainingRefund
        ? requestedRefund
        : remainingRefund
      ).toString(),
    ),
  };
}

export async function recordOrderReturn(
  actor: AuthenticatedUser,
  orderId: string,
  input: RecordReturnInput,
  database?: PrismaClient,
) {
  const scope = returnOrderScope(actor);
  input = recordReturnSchema.parse(input);
  const db = database ?? getDb();
  return withSerializableRetry(() =>
    db.$transaction(
      async (tx) => {
        // All return mutations share this lock, preventing duplicate reservations or restocks.
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        const order = await tx.order.findFirst({
          where: { id: orderId, ...scope },
          select: {
            status: true,
            items: {
              where: { id: input.orderItemId },
              select: {
                id: true,
                quantity: true,
                packedQuantity: true,
                unitPrice: true,
                sellingUnit: true,
              },
            },
          },
        });
        if (!order) throw new ReturnError("Order not found.", 404);
        const previous = await tx.orderReturn.findUnique({
          where: { id: input.requestId },
        });
        if (previous) {
          if (
            previous.orderId === orderId &&
            previous.recordedById === actor.id &&
            previous.orderItemId === input.orderItemId &&
            previous.quantity.equals(input.quantity) &&
            previous.reason === input.reason
          )
            return { id: previous.id };
          throw new ReturnError("This return request has already been used.");
        }
        if (order.status !== "DELIVERED")
          throw new ReturnError(
            "Returns can only be recorded for delivered orders.",
          );
        const item = order.items[0];
        if (!item) throw new ReturnError("Order item not found.", 404);
        const reserved = await tx.orderReturn.findMany({
          where: {
            orderItemId: item.id,
            status: { in: ["PENDING", "APPROVED"] },
          },
          select: { quantity: true, refundAmount: true },
        });
        const amounts = returnAmounts({
          quantity: input.quantity,
          deliveredQuantity: (item.packedQuantity ?? item.quantity).toString(),
          sellingUnit: item.sellingUnit,
          unitPrice: item.unitPrice.toFixed(2),
          reserved: reserved.map((row) => ({
            quantity: row.quantity.toString(),
            refundAmount: row.refundAmount.toFixed(2),
          })),
        });
        const saved = await tx.orderReturn.create({
          data: {
            id: input.requestId,
            orderId,
            orderItemId: item.id,
            ...amounts,
            reason: input.reason,
            recordedById: actor.id,
          },
        });
        await writeAuditLog(tx, {
          actorId: actor.id,
          action: "ORDER_RETURN_RECORDED",
          entityType: "ORDER",
          entityId: orderId,
          metadata: {
            returnId: saved.id,
            orderItemId: item.id,
            quantity: input.quantity,
            refundAmount: amounts.refundAmount,
          },
        });
        return { id: saved.id };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
        maxWait: 10000,
      },
    ),
  );
}

export async function reviewOrderReturn(
  actor: AuthenticatedUser,
  orderId: string,
  returnId: string,
  input: ReturnActionInput,
  database?: PrismaClient,
) {
  const scope = returnOrderScope(actor);
  input = returnActionSchema.parse(input);
  if (
    input.action !== "refund-paid" &&
    actor.role !== "SHOP_OWNER" &&
    actor.role !== "ADMIN"
  )
    throw new ReturnError("Only the owner can approve or reject returns.", 403);
  const db = database ?? getDb();
  return withSerializableRetry(() =>
    db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        if (
          !(await tx.order.findFirst({
            where: { id: orderId, ...scope },
            select: { id: true },
          }))
        )
          throw new ReturnError("Order not found.", 404);
        const record = await tx.orderReturn.findFirst({
          where: { id: returnId, orderId },
          include: {
            orderItem: { select: { productId: true, sellingUnit: true } },
          },
        });
        if (!record) throw new ReturnError("Return not found.", 404);
        if (input.action === "refund-paid") {
          if (
            record.status !== "APPROVED" ||
            record.refundPaidAt ||
            record.refundAmount.isZero()
          )
            throw new ReturnError(
              "Only an approved, unpaid refund can be recorded as paid.",
            );
          await tx.orderReturn.update({
            where: { id: record.id },
            data: { refundPaidAt: new Date(), refundPaidById: actor.id },
          });
        } else {
          if (record.status !== "PENDING")
            throw new ReturnError("This return has already been reviewed.");
          const restock = input.action === "approve" && input.restock;
          if (restock) {
            const product = await tx.product.findUnique({
              where: { id: record.orderItem.productId },
              select: { sellingUnit: true },
            });
            if (
              !product ||
              product.sellingUnit !== record.orderItem.sellingUnit
            )
              throw new ReturnError(
                "Product selling unit changed. Approve without restocking.",
              );
            await tx.product.update({
              where: { id: record.orderItem.productId },
              data: { stockQuantity: { increment: record.quantity } },
            });
          }
          await tx.orderReturn.update({
            where: { id: record.id },
            data: {
              status: input.action === "approve" ? "APPROVED" : "REJECTED",
              restock,
              reviewedById: actor.id,
              reviewedAt: new Date(),
              reviewNote: input.note ?? null,
            },
          });
        }
        await writeAuditLog(tx, {
          actorId: actor.id,
          action:
            input.action === "refund-paid"
              ? "ORDER_REFUND_RECORDED"
              : "ORDER_RETURN_REVIEWED",
          entityType: "ORDER",
          entityId: orderId,
          metadata: {
            returnId: record.id,
            action: input.action,
            quantity: record.quantity.toString(),
            refundAmount: record.refundAmount.toFixed(2),
            ...(input.action === "approve" ? { restock: input.restock } : {}),
          },
        });
        return { id: record.id };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
        maxWait: 10000,
      },
    ),
  );
}
