// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/types/auth";
import {
  recordOrderReturn,
  reviewOrderReturn,
  returnAmounts,
  returnOrderScope,
} from "@/services/order-return.service";

const orderId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const owner = { id: "owner", role: "SHOP_OWNER" } as AuthenticatedUser;
const staff = {
  id: "staff",
  role: "ORDER_STAFF",
  assignedShopId: "shop",
} as AuthenticatedUser;
const input = {
  requestId,
  orderItemId: itemId,
  quantity: "1",
  reason: "Damaged packaging",
};
function database() {
  const record = {
    id: requestId,
    orderId,
    orderItemId: itemId,
    quantity: new Prisma.Decimal(1),
    refundAmount: new Prisma.Decimal(90),
    reason: input.reason,
    recordedById: staff.id,
    status: "PENDING",
    refundPaidAt: null as Date | null,
    orderItem: { productId: "product", sellingUnit: "UNIT" },
  };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    order: {
      findFirst: vi.fn().mockResolvedValue({
        status: "DELIVERED",
        items: [
          {
            id: itemId,
            quantity: new Prisma.Decimal(2),
            packedQuantity: null,
            unitPrice: new Prisma.Decimal(90),
            sellingUnit: "UNIT",
          },
        ],
      }),
    },
    orderReturn: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockImplementation(async () => record),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }) => data),
      update: vi
        .fn()
        .mockImplementation(async ({ data }) => Object.assign(record, data)),
    },
    product: {
      findUnique: vi.fn().mockResolvedValue({ sellingUnit: "UNIT" }),
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit" }) },
  };
  const db = {
    $transaction: vi.fn(async (operation) => operation(tx)),
  } as unknown as PrismaClient;
  return { db, tx, record };
}

describe("return quantities and refund values", () => {
  it("rejects excess quantities, fractional units, and zero quantities", () => {
    const setup = {
      deliveredQuantity: "2",
      sellingUnit: "UNIT",
      unitPrice: "90.00",
      reserved: [{ quantity: "1", refundAmount: "90.00" }],
    };
    for (const quantity of ["2", "0.5", "0"])
      expect(() => returnAmounts({ ...setup, quantity })).toThrow();
    expect(returnAmounts({ ...setup, quantity: "1" }).refundAmount).toBe(
      "90.00",
    );
  });
  it("caps split kilogram refunds at the original paid line and settles rounding on the final return", () => {
    expect(
      returnAmounts({
        quantity: "0.001",
        deliveredQuantity: "0.002",
        sellingUnit: "KG",
        unitPrice: "5.00",
        reserved: [{ quantity: "0.001", refundAmount: "0.01" }],
      }).refundAmount,
    ).toBe("0.00");
    expect(
      returnAmounts({
        quantity: "0.001",
        deliveredQuantity: "0.003",
        sellingUnit: "KG",
        unitPrice: "3.00",
        reserved: [{ quantity: "0.002", refundAmount: "0.00" }],
      }).refundAmount,
    ).toBe("0.01");
  });
});

describe("order return workflow", () => {
  it("scopes owner and staff access and rejects unassigned staff and customers", () => {
    expect(returnOrderScope(owner)).toEqual({ shop: { ownerId: owner.id } });
    expect(returnOrderScope(staff)).toEqual({ shopId: "shop" });
    expect(() =>
      returnOrderScope({ ...staff, assignedShopId: null }),
    ).toThrow();
    expect(() => returnOrderScope({ ...staff, role: "CUSTOMER" })).toThrow();
  });
  it("records a server-priced pending return without touching stock", async () => {
    const { db, tx } = database();
    await recordOrderReturn(staff, orderId, input, db);
    expect(tx.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: orderId, shopId: "shop" } }),
    );
    expect(tx.orderReturn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recordedById: staff.id,
          refundAmount: "90.00",
        }),
      }),
    );
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
  it("rejects non-delivered and inaccessible orders without recording a return", async () => {
    const { db, tx } = database();
    tx.order.findFirst.mockResolvedValueOnce(null);
    await expect(
      recordOrderReturn(staff, orderId, input, db),
    ).rejects.toMatchObject({ status: 404 });
    tx.order.findFirst.mockResolvedValueOnce({
      status: "PREPARING",
      items: [],
    });
    await expect(recordOrderReturn(staff, orderId, input, db)).rejects.toThrow(
      "delivered orders",
    );
    expect(tx.orderReturn.create).not.toHaveBeenCalled();
  });
  it("makes a retry of the same return request idempotent", async () => {
    const { db, tx, record } = database();
    tx.orderReturn.findUnique.mockResolvedValue(record);
    await expect(recordOrderReturn(staff, orderId, input, db)).resolves.toEqual(
      { id: requestId },
    );
    expect(tx.orderReturn.create).not.toHaveBeenCalled();
    await expect(
      recordOrderReturn(
        staff,
        orderId,
        { ...input, reason: "Different reason" },
        db,
      ),
    ).rejects.toThrow("already been used");
  });
  it("denies staff approval before starting a transaction", async () => {
    const { db } = database();
    await expect(
      reviewOrderReturn(
        staff,
        orderId,
        requestId,
        { action: "approve", restock: true },
        db,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("restocks once on owner approval and rejects duplicate approvals", async () => {
    const { db, tx } = database();
    await reviewOrderReturn(
      owner,
      orderId,
      requestId,
      { action: "approve", restock: true },
      db,
    );
    await expect(
      reviewOrderReturn(
        owner,
        orderId,
        requestId,
        { action: "approve", restock: true },
        db,
      ),
    ).rejects.toThrow("already been reviewed");
    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.orderReturn.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          restock: true,
          reviewedById: owner.id,
        }),
      }),
    );
  });
  it("does not restock rejected or non-resaleable returns and blocks unit mismatches", async () => {
    const discarded = database();
    await reviewOrderReturn(
      owner,
      orderId,
      requestId,
      { action: "approve", restock: false },
      discarded.db,
    );
    expect(discarded.tx.product.update).not.toHaveBeenCalled();
    const rejected = database();
    await reviewOrderReturn(
      owner,
      orderId,
      requestId,
      { action: "reject", note: "Not eligible" },
      rejected.db,
    );
    expect(rejected.tx.product.update).not.toHaveBeenCalled();
    const changed = database();
    changed.tx.product.findUnique.mockResolvedValue({ sellingUnit: "KG" });
    await expect(
      reviewOrderReturn(
        owner,
        orderId,
        requestId,
        { action: "approve", restock: true },
        changed.db,
      ),
    ).rejects.toThrow("selling unit changed");
    expect(changed.tx.product.update).not.toHaveBeenCalled();
  });
  it("allows staff to record an approved cash refund once, with no stock change", async () => {
    const { db, tx, record } = database();
    await expect(
      reviewOrderReturn(
        staff,
        orderId,
        requestId,
        { action: "refund-paid" },
        db,
      ),
    ).rejects.toThrow("approved, unpaid");
    record.status = "APPROVED";
    await reviewOrderReturn(
      staff,
      orderId,
      requestId,
      { action: "refund-paid" },
      db,
    );
    await expect(
      reviewOrderReturn(
        staff,
        orderId,
        requestId,
        { action: "refund-paid" },
        db,
      ),
    ).rejects.toThrow("approved, unpaid");
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.orderReturn.update).toHaveBeenCalledTimes(1);
  });
});
