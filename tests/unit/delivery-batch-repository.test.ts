// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaDeliveryBatchRepository } from "@/repositories/delivery-batch.repository";
import type { AuditEntry } from "@/repositories/audit-write.repository";
import type { NotificationCreateRecord } from "@/services/order-notification.service";

function setup() {
  const transaction = {
    auditLog: { createMany: vi.fn().mockResolvedValue({ count: 50 }) },
    notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const runTransaction = vi.fn(async (operation) => operation(transaction));
  const prisma = { $transaction: runTransaction } as unknown as PrismaClient;
  return {
    transaction,
    runTransaction,
    repository: new PrismaDeliveryBatchRepository(prisma),
  };
}

const notification: NotificationCreateRecord = {
  userId: "customer-id",
  orderId: "order-id",
  type: "ORDER_ASSIGNED",
  title: "Order assigned",
  message: "Your order has been assigned.",
};

describe("delivery batch creation transactions", () => {
  it("writes a full batch of sanitized audits in one query before notifications", async () => {
    const { transaction, runTransaction, repository } = setup();
    const entries: AuditEntry[] = Array.from({ length: 50 }, (_, index) => ({
      actorId: "rider-id",
      action: "ORDER_STATUS_CHANGED",
      entityType: "ORDER",
      entityId: `order-${index}`,
      metadata: {
        newStatus: "ASSIGNED",
        nested: { token: "secret", batchId: "batch-id" },
      },
    }));

    await repository.transaction(async (tx) => {
      await tx.writeAudits([]);
      await tx.writeAudits(entries);
      await tx.createNotifications([notification]);
    });

    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "ReadCommitted",
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(transaction.auditLog.createMany).toHaveBeenCalledTimes(1);
    const records = transaction.auditLog.createMany.mock.calls[0]![0].data;
    expect(records).toHaveLength(50);
    expect(records[0]).toMatchObject({
      entityId: "order-0",
      metadata: { newStatus: "ASSIGNED", nested: { batchId: "batch-id" } },
    });
    expect(records[0].metadata.nested).not.toHaveProperty("token");
    expect(transaction.notification.createMany).toHaveBeenCalledWith({
      data: [notification],
      skipDuplicates: true,
    });
  });

  it("propagates notification failures to the enclosing transaction", async () => {
    const { transaction, repository } = setup();
    const failure = new Error("Notification write failed");
    transaction.notification.createMany.mockRejectedValue(failure);
    await expect(
      repository.transaction((tx) => tx.createNotifications([notification])),
    ).rejects.toBe(failure);
  });
});
