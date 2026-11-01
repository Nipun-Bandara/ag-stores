import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaAuditLogRepository } from "@/repositories/audit-log.repository";

it("resolves actor and affected names in batches while preserving original audit data", async () => {
  const base = {
    actorId: "admin-id",
    action: "SHOP_UPDATED",
    metadata: { changedFields: ["deliveryFee"] },
    createdAt: new Date(),
  };
  const logs = [
    { ...base, id: "a", entityType: "SHOP", entityId: "shop-id" },
    { ...base, id: "b", entityType: "SHOP", entityId: "shop-id" },
    { ...base, id: "c", entityType: "USER", entityId: "missing-user" },
    { ...base, id: "d", entityType: "PRODUCT", entityId: "product-id" },
    { ...base, id: "e", entityType: "ORDER", entityId: "order-id" },
  ];
  const db = {
    auditLog: { findMany: vi.fn().mockResolvedValue(logs) },
    user: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: "admin-id", name: "Administrator" }]),
    },
    shop: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: "shop-id", name: "Colombo Shop" }]),
    },
    product: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: "product-id", nameEn: "Tea" }]),
    },
    order: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: "order-id", shop: { name: "Colombo Shop" } },
        ]),
    },
  };
  const repository = new PrismaAuditLogRepository(
    db as unknown as PrismaClient,
  );
  const result = await repository.findMany({ action: "SHOP_UPDATED" });
  expect(result[0]).toEqual({
    ...logs[0],
    actorName: "Administrator",
    entityName: "Colombo Shop",
  });
  expect(result[2]?.entityName).toBeNull();
  expect(result[3]?.entityName).toBe("Tea");
  expect(result[4]?.entityName).toBe("Colombo Shop");
  expect(db.user.findMany).toHaveBeenCalledExactlyOnceWith({
    where: { id: { in: ["admin-id", "missing-user"] } },
    select: { id: true, name: true },
  });
  expect(db.shop.findMany).toHaveBeenCalledExactlyOnceWith({
    where: { id: { in: ["shop-id"] } },
    select: { id: true, name: true },
  });
  expect(db.auditLog.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { action: "SHOP_UPDATED" }, take: 100 }),
  );
});

it("does not query names when no audit records exist", async () => {
  const db = {
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findMany: vi.fn() },
  };
  expect(
    await new PrismaAuditLogRepository(db as unknown as PrismaClient).findMany(
      {},
    ),
  ).toEqual([]);
  expect(db.user.findMany).not.toHaveBeenCalled();
});

it("applies pagination to the database query beyond the old 100-record limit", async () => {
  const db = { auditLog: { findMany: vi.fn().mockResolvedValue([]) } };
  await new PrismaAuditLogRepository(db as unknown as PrismaClient).findMany(
    { entityType: "SHOP" },
    { page: 6, pageSize: 25 },
  );
  expect(db.auditLog.findMany).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      where: { entityType: "SHOP" },
      skip: 125,
      take: 26,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  );
});
