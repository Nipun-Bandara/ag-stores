// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as ownerDashboardRoute } from "@/app/api/owner/dashboard/route";
import { OrderStatus, PrismaClient, UserRole } from "@/generated/prisma/client";
import { PrismaOwnerDashboardRepository } from "@/repositories/owner-dashboard.repository";
import { getOwnerDashboard } from "@/services/owner-dashboard.service";
import type { AuthenticatedUser } from "@/types/auth";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("owner dashboard metrics", () => {
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
  let addressId = "";
  let ownerUser: AuthenticatedUser;

  beforeAll(async () => {
    const [owner, otherOwner, customer] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Dashboard Owner",
          email: `dashboard-owner-${suffix}@example.test`,
          passwordHash: "integration-test-only",
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Other Dashboard Owner",
          email: `other-dashboard-owner-${suffix}@example.test`,
          passwordHash: "integration-test-only",
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Dashboard Customer",
          email: `dashboard-customer-${suffix}@example.test`,
          passwordHash: "integration-test-only",
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    userIds.push(owner.id, otherOwner.id, customer.id);
    ownerUser = owner;

    const [shop, otherShop] = await Promise.all([
      prisma.shop.create({
        data: {
          ownerId: owner.id,
          name: `Dashboard Shop ${suffix}`,
          address: "1 Dashboard Road",
          latitude: "6.927079",
          longitude: "79.861244",
          phone: `+9471${Date.now().toString().slice(-7)}`,
        },
      }),
      prisma.shop.create({
        data: {
          ownerId: otherOwner.id,
          name: `Other Dashboard Shop ${suffix}`,
          address: "2 Other Dashboard Road",
          latitude: "6.900000",
          longitude: "79.800000",
          phone: `+9472${Date.now().toString().slice(-7)}`,
        },
      }),
    ]);
    shopIds.push(shop.id, otherShop.id);

    const [category, otherCategory] = await Promise.all([
      prisma.category.create({
        data: { shopId: shop.id, nameEn: `Dashboard ${suffix}` },
      }),
      prisma.category.create({
        data: { shopId: otherShop.id, nameEn: `Other Dashboard ${suffix}` },
      }),
    ]);
    categoryIds.push(category.id, otherCategory.id);

    const products = await Promise.all([
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          nameEn: `Low Stock ${suffix}`,
          price: "100.00",
          stockQuantity: 3,
          lowStockThreshold: 5,
        },
      }),
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          nameEn: `Available ${suffix}`,
          price: "100.00",
          stockQuantity: 10,
          lowStockThreshold: 5,
        },
      }),
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          nameEn: `Out ${suffix}`,
          price: "100.00",
          stockQuantity: 0,
          lowStockThreshold: 5,
        },
      }),
      prisma.product.create({
        data: {
          shopId: otherShop.id,
          categoryId: otherCategory.id,
          nameEn: `Other Low Stock ${suffix}`,
          price: "100.00",
          stockQuantity: 1,
          lowStockThreshold: 5,
        },
      }),
    ]);
    productIds.push(...products.map(({ id }) => id));

    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: `Dashboard ${suffix}`,
          address: "10 Customer Road",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      })
    ).id;

    const today = new Date("2026-10-07T06:00:00.000Z");
    const yesterday = new Date("2026-10-06T06:00:00.000Z");
    const base = {
      customerId: customer.id,
      deliveryAddressId: addressId,
    };
    const createOrder = (
      orderShopId: string,
      status: OrderStatus,
      total: string,
      createdAt: Date,
      updatedAt: Date,
    ) =>
      prisma.order.create({
        data: {
          ...base,
          shopId: orderShopId,
          status,
          subtotal: total,
          deliveryFee: "0.00",
          total,
          createdAt,
          updatedAt,
        },
      });
    await Promise.all([
      createOrder(shop.id, OrderStatus.PLACED, "125.00", today, today),
      createOrder(shop.id, OrderStatus.CONFIRMED, "225.00", today, today),
      createOrder(shop.id, OrderStatus.PREPARING, "325.00", today, today),
      createOrder(
        shop.id,
        OrderStatus.READY_FOR_DELIVERY,
        "425.00",
        today,
        today,
      ),
      createOrder(
        shop.id,
        OrderStatus.OUT_FOR_DELIVERY,
        "525.00",
        today,
        today,
      ),
      createOrder(shop.id, OrderStatus.DELIVERED, "500.00", today, today),
      createOrder(shop.id, OrderStatus.DELIVERED, "250.00", yesterday, today),
      createOrder(
        shop.id,
        OrderStatus.DELIVERED,
        "999.00",
        yesterday,
        yesterday,
      ),
      createOrder(shop.id, OrderStatus.CANCELLED, "400.00", today, today),
      createOrder(
        otherShop.id,
        OrderStatus.DELIVERED,
        "10000.00",
        today,
        today,
      ),
    ]);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    if (addressId) {
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    }
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("calculates owner-only metrics and delivered-only revenue", async () => {
    const dashboard = await getOwnerDashboard(
      ownerUser,
      new PrismaOwnerDashboardRepository(prisma),
      new Date("2026-10-07T12:00:00.000Z"),
    );

    expect(dashboard).toMatchObject({
      ordersToday: 7,
      pendingOrders: 2,
      preparingOrders: 1,
      readyForDelivery: 1,
      outForDelivery: 1,
      deliveredToday: 2,
      revenueToday: "750.00",
    });
    expect(dashboard.lowStockProducts).toEqual([
      expect.objectContaining({
        nameEn: `Low Stock ${suffix}`,
        stockQuantity: 3,
        lowStockThreshold: 5,
      }),
    ]);
  });

  it("rejects anonymous dashboard API access", async () => {
    const response = await ownerDashboardRoute(
      new NextRequest("http://localhost/api/owner/dashboard"),
    );

    expect(response.status).toBe(401);
  });
});
