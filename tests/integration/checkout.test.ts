// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as checkoutRoute } from "@/app/api/checkout/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { PaymentMethod, PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(token?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describeWithDatabase("cash on delivery checkout", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  let token: string;
  let otherToken: string;
  let customerId: string;
  let otherCustomerId: string;
  let addressId: string;
  let otherAddressId: string;
  let categoryId: string;
  let availableProductId: string;
  let unavailableProductId: string;
  let lowStockProductId: string;
  let createdOrderId: string;

  async function register(email: string) {
    const response = await registerRoute(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Checkout Customer",
          email,
          phone: "",
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        }),
      }),
    );
    const body = await response.json();
    userIds.push(body.data.id);
    return {
      id: body.data.id as string,
      token: response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "",
    };
  }

  beforeAll(async () => {
    const customer = await register(`checkout-${suffix}@example.test`);
    const other = await register(`checkout-other-${suffix}@example.test`);
    customerId = customer.id;
    otherCustomerId = other.id;
    token = customer.token;
    otherToken = other.token;

    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId,
          label: "Home",
          address: "1 Checkout Road",
          latitude: "6.927079",
          longitude: "79.861244",
          isDefault: true,
        },
      })
    ).id;
    otherAddressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: otherCustomerId,
          label: "Other Home",
          address: "2 Other Road",
          latitude: "6.900000",
          longitude: "79.800000",
          isDefault: true,
        },
      })
    ).id;

    const shop = await prisma.shop.findFirstOrThrow();
    categoryId = (
      await prisma.category.create({
        data: {
          shopId: shop.id,
          nameEn: `Checkout ${suffix}`,
        },
      })
    ).id;
    const products = await Promise.all([
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId,
          nameEn: `Available Checkout ${suffix}`,
          price: "100.00",
          stockQuantity: 10,
        },
      }),
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId,
          nameEn: `Unavailable Checkout ${suffix}`,
          price: "50.00",
          stockQuantity: 5,
          isAvailable: false,
        },
      }),
      prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId,
          nameEn: `Low Stock Checkout ${suffix}`,
          price: "75.00",
          stockQuantity: 1,
        },
      }),
    ]);
    availableProductId = products[0].id;
    unavailableProductId = products[1].id;
    lowStockProductId = products[2].id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { customerId: { in: userIds } } },
    });
    await prisma.order.deleteMany({ where: { customerId: { in: userIds } } });
    await prisma.customerAddress.deleteMany({
      where: { customerId: { in: userIds } },
    });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  const body = (productId = availableProductId, quantity = 1) => ({
    deliveryAddressId: addressId,
    deliveryInstructions: "Call at the gate",
    items: [{ productId, quantity }],
  });

  it("rejects anonymous checkout", async () => {
    const response = await checkoutRoute(request(undefined, body()));
    expect(response.status).toBe(401);
  });

  it("rejects an empty cart", async () => {
    const response = await checkoutRoute(
      request(token, { deliveryAddressId: addressId, items: [] }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid and another customer's addresses", async () => {
    const invalid = await checkoutRoute(
      request(token, { ...body(), deliveryAddressId: randomUUID() }),
    );
    const anotherCustomer = await checkoutRoute(
      request(token, { ...body(), deliveryAddressId: otherAddressId }),
    );
    const otherUserCannotUseOwnTokenForCustomerAddress = await checkoutRoute(
      request(otherToken, { ...body(), deliveryAddressId: addressId }),
    );

    expect(invalid.status).toBe(404);
    expect(anotherCustomer.status).toBe(404);
    expect(otherUserCannotUseOwnTokenForCustomerAddress.status).toBe(404);
  });

  it("rejects unavailable products without changing stock", async () => {
    const response = await checkoutRoute(
      request(token, body(unavailableProductId)),
    );
    expect(response.status).toBe(409);
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: unavailableProductId },
        })
      ).stockQuantity,
    ).toBe(5);
  });

  it("rejects insufficient stock without changing stock", async () => {
    const response = await checkoutRoute(
      request(token, body(lowStockProductId, 2)),
    );
    expect(response.status).toBe(409);
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: lowStockProductId },
        })
      ).stockQuantity,
    ).toBe(1);
  });

  it("recalculates price and atomically stores the correct order totals and items", async () => {
    await prisma.product.update({
      where: { id: availableProductId },
      data: { price: "125.50" },
    });
    const response = await checkoutRoute(
      request(token, {
        ...body(availableProductId, 2),
        items: [{ productId: availableProductId, quantity: 2, price: "0.01" }],
      }),
    );
    const payload = await response.json();
    createdOrderId = payload.data.id;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: createdOrderId },
      include: { items: true },
    });
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: availableProductId },
    });

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      subtotal: "251.00",
      deliveryFee: "250.00",
      total: "501.00",
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      deliveryInstructions: "Call at the gate",
    });
    expect(order.subtotal.toFixed(2)).toBe("251.00");
    expect(order.deliveryFee.toFixed(2)).toBe("250.00");
    expect(order.total.toFixed(2)).toBe("501.00");
    expect(order.paymentMethod).toBe(PaymentMethod.CASH_ON_DELIVERY);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productId: availableProductId,
      quantity: 2,
    });
    expect(order.items[0]?.unitPrice.toFixed(2)).toBe("125.50");
    expect(product.stockQuantity).toBe(8);
  });

  it("allows only one simultaneous checkout to claim the final stock unit", async () => {
    await prisma.product.update({
      where: { id: lowStockProductId },
      data: { stockQuantity: 1, isAvailable: true },
    });

    const [first, second] = await Promise.all([
      checkoutRoute(request(token, body(lowStockProductId, 1))),
      checkoutRoute(
        request(otherToken, {
          ...body(lowStockProductId, 1),
          deliveryAddressId: otherAddressId,
        }),
      ),
    ]);
    const statuses = [first.status, second.status].sort();
    const storedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: lowStockProductId },
    });
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: lowStockProductId },
    });

    expect(statuses).toEqual([201, 409]);
    expect(storedProduct.stockQuantity).toBe(0);
    expect(orderItemCount).toBe(1);
  });
});
