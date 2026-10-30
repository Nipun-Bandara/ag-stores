// @vitest-environment node

import { expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaDeliveryBatchManagementRepository } from "@/repositories/delivery-batch-management.repository";

it("allows time to acquire and complete a delivery lifecycle transaction", async () => {
  const transaction = {};
  const runTransaction = vi.fn(async (operation) => operation(transaction));
  const prisma = { $transaction: runTransaction } as unknown as PrismaClient;
  const repository = new PrismaDeliveryBatchManagementRepository(prisma);

  const result = await repository.transaction(async () => "started");

  expect(result).toBe("started");
  expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "ReadCommitted",
    maxWait: 10_000,
    timeout: 30_000,
  });
});
