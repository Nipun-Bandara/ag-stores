// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PreferredLanguage,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { checkout } from "@/services/checkout.service";
import { savePackedWeight } from "@/services/packing.service";
import { transitionOrderStatus } from "@/services/order-status.service";
import { getCustomerOrderDetails } from "@/services/customer-order.service";
import { getOwnerOrder } from "@/services/owner-order.service";
import { PrismaDeliveryOrderRepository } from "@/repositories/delivery-order.repository";
import type { AuthenticatedUser } from "@/types/auth";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("packed KG orders", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url ?? "postgresql://unused@localhost:1/unused",
    }),
  });
  const users: string[] = [];
  let shopId: string,
    categoryId: string,
    addressId: string,
    kgId: string,
    unitId: string;
  let owner: AuthenticatedUser,
    other: AuthenticatedUser,
    customer: AuthenticatedUser;
  const actor = (id: string, role: UserRole): AuthenticatedUser => ({
    id,
    role,
    name: "Packing test",
    email: null,
    phone: "+94770000000",
    firstName: "Test",
    lastName: "Owner",
    preferredLanguage: PreferredLanguage.EN,
    status: UserStatus.ACTIVE,
  });
  const pack = (
    itemId: string,
    expectedVersion: number,
    packedQuantity: string,
    customerContactAgreed = false,
    customerContactNote?: string,
  ) => ({
    itemId,
    expectedVersion,
    packedQuantity,
    customerContactAgreed,
    customerContactNote,
  });
  async function preparing(quantity: number, includeUnit = false) {
    const placed = await checkout(customer, {
      deliveryAddressId: addressId,
      items: [
        { productId: kgId, quantity, sellingUnit: "KG" },
        ...(includeUnit
          ? [{ productId: unitId, quantity: 1, sellingUnit: "UNIT" as const }]
          : []),
      ],
    });
    await transitionOrderStatus(owner, placed.id, "CONFIRMED");
    await transitionOrderStatus(owner, placed.id, "PREPARING");
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: placed.id, productId: kgId },
    });
    return {
      id: placed.id,
      itemId: item.id,
      unitPrice: item.unitPrice.toFixed(2),
    };
  }
  beforeAll(async () => {
    for (const role of [
      UserRole.SHOP_OWNER,
      UserRole.SHOP_OWNER,
      UserRole.CUSTOMER,
    ])
      users.push(
        (
          await prisma.user.create({
            data: {
              name: "Packing",
              firstName: "Packing",
              lastName: "Tester",
              phone: `+947${randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
              email: `${randomUUID()}@example.test`,
              passwordHash: "test-only",
              role,
            },
          })
        ).id,
      );
    owner = actor(users[0]!, UserRole.SHOP_OWNER);
    other = actor(users[1]!, UserRole.SHOP_OWNER);
    customer = actor(users[2]!, UserRole.CUSTOMER);
    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `Packing ${randomUUID()}`,
        address: "Test",
        phone: randomUUID().slice(0, 30),
        latitude: "6.9",
        longitude: "79.8",
        isOpen: true,
        deliveryFee: "20.00",
      },
    });
    shopId = shop.id;
    categoryId = (
      await prisma.category.create({ data: { shopId, nameEn: "Packing" } })
    ).id;
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Packing",
          address: "Test",
          latitude: "6.9",
          longitude: "79.8",
        },
      })
    ).id;
    const kg = await prisma.product.create({
      data: {
        shopId,
        categoryId,
        nameEn: "Bulk rice",
        itemCode: randomUUID(),
        sellingUnit: "KG",
        price: "200.00",
        stockQuantity: "20.000",
        minimumOrderQuantity: "0.002",
        orderingIncrement: "0.001",
        discountTiers: {
          create: [
            { position: 1, minimumQuantity: "2.000", discountAmount: "20.00" },
          ],
        },
      },
    });
    kgId = kg.id;
    unitId = (
      await prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: "Packet",
          itemCode: randomUUID(),
          price: "10.00",
          stockQuantity: "5.000",
        },
      })
    ).id;
  });
  afterAll(async () => {
    const ids = (
      await prisma.order.findMany({ where: { shopId }, select: { id: true } })
    ).map((item) => item.id);
    await prisma.notification.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: ids } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await prisma.productDiscountTier.deleteMany({
      where: { productId: { in: [kgId, unitId] } },
    });
    await prisma.product.deleteMany({ where: { shopId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    await prisma.shop.deleteMany({ where: { id: shopId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it("rejects customer edits and weights before PREPARING", async () => {
    const placed = await checkout(customer, {
      deliveryAddressId: addressId,
      items: [{ productId: kgId, quantity: 1, sellingUnit: "KG" }],
    });
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: placed.id },
    });
    await expect(
      savePackedWeight(customer, placed.id, pack(item.id, 0, "1.04")),
    ).rejects.toMatchObject({ code: "OWNER_ONLY" });
    await expect(
      savePackedWeight(owner, placed.id, pack(item.id, 0, "1.04")),
    ).rejects.toMatchObject({ code: "PACKING_CLOSED" });
    await transitionOrderStatus(owner, placed.id, "CONFIRMED");
    await expect(
      savePackedWeight(owner, placed.id, pack(item.id, 0, "1.04")),
    ).rejects.toMatchObject({ code: "PACKING_CLOSED" });
  });
  it("preserves requested weight and checkout rate across the tier boundary and locks at ready", async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: { minimumOrderAmount: "370.00" },
    });
    const order = await preparing(2, true);
    expect(order.unitPrice).toBe("180.00");
    await expect(
      transitionOrderStatus(owner, order.id, "READY_FOR_DELIVERY"),
    ).rejects.toMatchObject({ code: "PACKING_INCOMPLETE" });
    const unit = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id, productId: unitId },
    });
    await expect(
      savePackedWeight(owner, order.id, pack(unit.id, 0, "1.04")),
    ).rejects.toMatchObject({ code: "INVALID_ITEM" });
    await expect(
      savePackedWeight(other, order.id, pack(order.itemId, 0, "1.98")),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    const beforeStock = (
      await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
    ).stockQuantity;
    const saved = await savePackedWeight(
      owner,
      order.id,
      pack(order.itemId, 0, "1.98"),
    );
    expect(saved).toMatchObject({
      subtotal: "366.40",
      total: "386.40",
      newLineTotal: "356.40",
      packingVersion: 1,
    });
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
      ).stockQuantity
        .minus(beforeStock)
        .toString(),
    ).toBe("0.02");
    await expect(
      savePackedWeight(owner, order.id, pack(order.itemId, 0, "2.10")),
    ).rejects.toMatchObject({ code: "ORDER_CHANGED" });
    const views = [
      await getCustomerOrderDetails(customer, order.id),
      await getOwnerOrder(owner, order.id),
    ];
    for (const view of views) {
      expect(view.items.find((item) => item.id === order.itemId)).toMatchObject(
        {
          quantity: 2,
          packedQuantity: 1.98,
          unitPrice: "180.00",
          lineTotal: "356.40",
          estimatedLineTotal: "360.00",
        },
      );
      expect(view.estimatedTotal).toBe("390.00");
      expect(view.total).toBe("386.40");
    }
    await prisma.product.update({
      where: { id: kgId },
      data: { price: "999.00", discountTiers: { deleteMany: {} } },
    });
    await savePackedWeight(owner, order.id, pack(order.itemId, 1, "2.00"));
    await transitionOrderStatus(owner, order.id, "READY_FOR_DELIVERY");
    await expect(
      savePackedWeight(owner, order.id, pack(order.itemId, 2, "2.01")),
    ).rejects.toMatchObject({ code: "PACKING_CLOSED" });
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(stored.packingFinalizedAt).not.toBeNull();
    expect(stored.total.toFixed(2)).toBe("390.00");
    const delivery = await new PrismaDeliveryOrderRepository(
      prisma,
    ).findAvailableOrders(shopId);
    expect(
      delivery.find((candidate) => candidate.id === order.id)?.total.toFixed(2),
    ).toBe("390.00");
    expect(
      stored.items
        .find((item) => item.id === order.itemId)
        ?.quantity.toString(),
    ).toBe("2");
    expect(
      (
        await prisma.notification.findFirst({
          where: {
            orderId: order.id,
            userId: customer.id,
            type: "ORDER_READY_FOR_DELIVERY",
          },
        })
      )?.message,
    ).toContain("390.00");
    await prisma.shop.update({
      where: { id: shopId },
      data: { minimumOrderAmount: "0.00" },
    });
  });
  it("reconciles repeated edits, requires fresh contact acknowledgement, and rolls back unavailable stock", async () => {
    await prisma.product.update({
      where: { id: kgId },
      data: { price: "200.00", stockQuantity: "10.000" },
    });
    const order = await preparing(1);
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
      ).stockQuantity.toString(),
    ).toBe("9");
    await savePackedWeight(owner, order.id, pack(order.itemId, 0, "1.04"));
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
      ).stockQuantity.toString(),
    ).toBe("8.96");
    await savePackedWeight(owner, order.id, pack(order.itemId, 1, "1.02"));
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
      ).stockQuantity.toString(),
    ).toBe("8.98");
    await expect(
      savePackedWeight(owner, order.id, pack(order.itemId, 2, "1.20")),
    ).rejects.toMatchObject({ code: "CUSTOMER_CONTACT_REQUIRED" });
    await savePackedWeight(
      owner,
      order.id,
      pack(order.itemId, 2, "1.20", true, "Called customer; agreed"),
    );
    await expect(
      savePackedWeight(owner, order.id, pack(order.itemId, 3, "1.21")),
    ).rejects.toMatchObject({ code: "CUSTOMER_CONTACT_REQUIRED" });
    const before = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    await prisma.product.update({
      where: { id: kgId },
      data: { stockQuantity: "0.000" },
    });
    await expect(
      savePackedWeight(
        owner,
        order.id,
        pack(order.itemId, 3, "1.30", true, "Called again"),
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(after.total.toFixed(2)).toBe(before.total.toFixed(2));
    expect(after.packingVersion).toBe(3);
    expect(
      after.items
        .find((item) => item.id === order.itemId)
        ?.packedQuantity?.toString(),
    ).toBe("1.2");
    const changes = await prisma.auditLog.findMany({
      where: { entityId: order.id, action: "ORDER_PACKING_UPDATED" },
    });
    expect(changes).toHaveLength(3);
    expect(JSON.stringify(changes.at(-1)?.metadata)).toContain(
      "customerContactAgreed",
    );
  });
  it("accepts only one concurrent edit per version and preserves legacy readiness", async () => {
    await prisma.product.update({
      where: { id: kgId },
      data: { stockQuantity: "10.000" },
    });
    const order = await preparing(1);
    const outcomes = await Promise.allSettled([
      savePackedWeight(owner, order.id, pack(order.itemId, 0, "1.01")),
      savePackedWeight(owner, order.id, pack(order.itemId, 0, "1.02")),
    ]);
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .packingVersion,
    ).toBe(1);
    const old = await preparing(1);
    await prisma.order.update({
      where: { id: old.id },
      data: {
        packingRequired: false,
        estimatedSubtotal: null,
        estimatedTotal: null,
      },
    });
    await transitionOrderStatus(owner, old.id, "READY_FOR_DELIVERY");
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: old.id } }))
        .packingFinalizedAt,
    ).toBeNull();
  });
  it("rechecks a changed shop allowance and serializes packing with readiness", async () => {
    await prisma.product.update({
      where: { id: kgId },
      data: { stockQuantity: "10.000" },
    });
    const order = await preparing(1);
    await savePackedWeight(owner, order.id, pack(order.itemId, 0, "1.04"));
    await prisma.shop.update({
      where: { id: shopId },
      data: { weightDifferenceAllowancePct: "1.00" },
    });
    await expect(
      transitionOrderStatus(owner, order.id, "READY_FOR_DELIVERY"),
    ).rejects.toMatchObject({ code: "CUSTOMER_CONTACT_REQUIRED" });
    await savePackedWeight(
      owner,
      order.id,
      pack(order.itemId, 1, "1.04", true, "Called and agreed to 1.04kg"),
    );
    await prisma.shop.update({
      where: { id: shopId },
      data: { weightDifferenceAllowancePct: "10.00" },
    });
    await Promise.allSettled([
      savePackedWeight(owner, order.id, pack(order.itemId, 2, "1.02")),
      transitionOrderStatus(owner, order.id, "READY_FOR_DELIVERY"),
    ]);
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(stored.status).toBe("READY_FOR_DELIVERY");
    const item = stored.items.find((line) => line.id === order.itemId)!;
    expect(stored.subtotal.toFixed(2)).toBe(
      item.unitPrice.mul(item.packedQuantity!).toFixed(2),
    );
    await expect(
      savePackedWeight(
        owner,
        order.id,
        pack(order.itemId, stored.packingVersion, "1.03"),
      ),
    ).rejects.toMatchObject({ code: "PACKING_CLOSED" });
  });
});
