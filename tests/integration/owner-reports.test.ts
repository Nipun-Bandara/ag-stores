// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OrderStatus, PrismaClient, UserRole } from "@/generated/prisma/client";
import { getOwnerReports } from "@/services/owner-report.service";
import type { AuthenticatedUser } from "@/types/auth";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("owner reports", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const categoryIds: string[] = [];
  const productIds: string[] = [];
  const addressIds: string[] = [];
  const orderIds: string[] = [];
  let owner: AuthenticatedUser;
  let emptyOwner: AuthenticatedUser;
  let firstProductId = "";
  let secondProductId = "";

  beforeAll(async () => {
    const [ownerRecord, otherOwner, emptyOwnerRecord, customer] =
      await Promise.all([
        prisma.user.create({
          data: {
            name: "Reporting Owner",
            email: `report-owner-${suffix}@example.test`,
            passwordHash: "test-only",
            role: UserRole.SHOP_OWNER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Other Reporting Owner",
            email: `other-report-owner-${suffix}@example.test`,
            passwordHash: "test-only",
            role: UserRole.SHOP_OWNER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Empty Reporting Owner",
            email: `empty-report-owner-${suffix}@example.test`,
            passwordHash: "test-only",
            role: UserRole.SHOP_OWNER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Reporting Customer",
            email: `report-customer-${suffix}@example.test`,
            passwordHash: "test-only",
            role: UserRole.CUSTOMER,
          },
        }),
      ]);
    userIds.push(
      ownerRecord.id,
      otherOwner.id,
      emptyOwnerRecord.id,
      customer.id,
    );
    owner = ownerRecord;
    emptyOwner = emptyOwnerRecord;

    const [shop, otherShop] = await Promise.all([
      prisma.shop.create({
        data: {
          ownerId: ownerRecord.id,
          name: `Reporting Shop ${suffix}`,
          address: "1 Reporting Road",
          latitude: "6.927079",
          longitude: "79.861244",
          phone: `+941${Date.now().toString().slice(-8)}`,
        },
      }),
      prisma.shop.create({
        data: {
          ownerId: otherOwner.id,
          name: `Other Reporting Shop ${suffix}`,
          address: "2 Reporting Road",
          latitude: "6.900000",
          longitude: "79.800000",
          phone: `+942${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    shopIds.push(shop.id, otherShop.id);

    const [category, otherCategory] = await Promise.all([
      prisma.category.create({
        data: { shopId: shop.id, nameEn: `Report Category ${suffix}` },
      }),
      prisma.category.create({
        data: {
          shopId: otherShop.id,
          nameEn: `Other Report Category ${suffix}`,
        },
      }),
    ]);
    categoryIds.push(category.id, otherCategory.id);
    const [firstProduct, secondProduct, otherProduct] = await Promise.all([
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          nameEn: "Report Product A",
          price: "50.00",
          stockQuantity: 2,
          lowStockThreshold: 5,
        },
      }),
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          nameEn: "Report Product B",
          price: "50.00",
          stockQuantity: 10,
          lowStockThreshold: 5,
        },
      }),
      prisma.product.create({
        data: {
          shopId: otherShop.id,
          categoryId: otherCategory.id,
          nameEn: "Other Shop Product",
          price: "999.00",
          stockQuantity: 1,
          lowStockThreshold: 5,
        },
      }),
    ]);
    firstProductId = firstProduct.id;
    secondProductId = secondProduct.id;
    productIds.push(firstProduct.id, secondProduct.id, otherProduct.id);

    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Reporting address",
        address: "3 Reporting Road",
        latitude: "6.930000",
        longitude: "79.860000",
      },
    });
    addressIds.push(address.id);

    async function createOrder(
      shopId: string,
      status: OrderStatus,
      total: string,
      createdAt: Date,
      productId: string,
      quantity: number,
    ) {
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          shopId,
          deliveryAddressId: address.id,
          status,
          subtotal: total,
          deliveryFee: "0.00",
          total,
          createdAt,
          items: { create: { productId, quantity, unitPrice: "50.00" } },
        },
      });
      orderIds.push(order.id);
    }

    await Promise.all([
      createOrder(
        shop.id,
        OrderStatus.PLACED,
        "100.00",
        new Date("2026-10-01T06:00:00.000Z"),
        firstProduct.id,
        2,
      ),
      createOrder(
        shop.id,
        OrderStatus.DELIVERED,
        "300.00",
        new Date("2026-10-01T08:00:00.000Z"),
        firstProduct.id,
        3,
      ),
      createOrder(
        shop.id,
        OrderStatus.DELIVERED,
        "200.00",
        new Date("2026-10-02T08:00:00.000Z"),
        secondProduct.id,
        4,
      ),
      createOrder(
        shop.id,
        OrderStatus.FAILED_DELIVERY,
        "150.00",
        new Date("2026-10-03T08:00:00.000Z"),
        firstProduct.id,
        1,
      ),
      createOrder(
        shop.id,
        OrderStatus.DELIVERED,
        "5000.00",
        new Date("2026-09-29T08:00:00.000Z"),
        firstProduct.id,
        100,
      ),
      createOrder(
        otherShop.id,
        OrderStatus.DELIVERED,
        "999.00",
        new Date("2026-10-01T09:00:00.000Z"),
        otherProduct.id,
        20,
      ),
    ]);
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: addressIds } },
    });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("calculates date-filtered reports using only the owner's shops", async () => {
    const report = await getOwnerReports(owner, {
      from: "2026-10-01",
      to: "2026-10-03",
    });

    expect(report.summary).toEqual({
      totalOrders: 4,
      totalRevenue: "500.00",
      completedDeliveries: 2,
      failedDeliveries: 1,
    });
    expect(report.dailyOrders).toEqual([
      { date: "2026-10-01", orders: 2 },
      { date: "2026-10-02", orders: 1 },
      { date: "2026-10-03", orders: 1 },
    ]);
    expect(report.ordersByStatus).toEqual(
      expect.arrayContaining([
        { status: OrderStatus.PLACED, orders: 1 },
        { status: OrderStatus.DELIVERED, orders: 2 },
        { status: OrderStatus.FAILED_DELIVERY, orders: 1 },
      ]),
    );
    expect(report.bestSellingProducts[0]).toMatchObject({
      productId: firstProductId,
      quantitySold: 5,
    });
    expect(report.lowStockProducts).toEqual([
      expect.objectContaining({
        productId: firstProductId,
        stockQuantity: 2,
      }),
    ]);
    expect(report.bestSellingProducts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nameEn: "Other Shop Product" }),
      ]),
    );
  });

  it("applies a status filter to order and product calculations", async () => {
    const report = await getOwnerReports(owner, {
      from: "2026-10-01",
      to: "2026-10-03",
      status: OrderStatus.DELIVERED,
    });

    expect(report.summary).toMatchObject({
      totalOrders: 2,
      totalRevenue: "500.00",
      completedDeliveries: 2,
      failedDeliveries: 0,
    });
    expect(report.ordersByStatus).toEqual([
      { status: OrderStatus.DELIVERED, orders: 2 },
    ]);
    expect(report.bestSellingProducts[0]).toMatchObject({
      productId: secondProductId,
      quantitySold: 4,
    });
  });

  it("returns a safe empty report for an owner without shops", async () => {
    await expect(
      getOwnerReports(emptyOwner, {
        from: "2026-10-01",
        to: "2026-10-03",
      }),
    ).resolves.toMatchObject({
      summary: {
        totalOrders: 0,
        totalRevenue: "0.00",
        completedDeliveries: 0,
        failedDeliveries: 0,
      },
      dailyOrders: [],
      dailyRevenue: [],
      ordersByStatus: [],
      bestSellingProducts: [],
      lowStockProducts: [],
    });
  });
});
