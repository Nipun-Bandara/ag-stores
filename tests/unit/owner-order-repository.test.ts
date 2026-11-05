// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaOwnerOrderRepository } from "@/repositories/owner-order.repository";

it("loads shop details and the owner account mobile for an owned order receipt", async () => {
  const findFirst = vi.fn().mockResolvedValue(null);
  const repository = new PrismaOwnerOrderRepository({
    order: { findFirst },
  } as unknown as PrismaClient);
  await repository.findOwnedById("owner-id", "order-id");
  expect(findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "order-id", shop: { ownerId: "owner-id" } },
      select: expect.objectContaining({
        shop: {
          select: {
            name: true,
            address: true,
            owner: { select: { phone: true } },
            weightDifferenceAllowancePct: true,
          },
        },
      }),
    }),
  );
});
