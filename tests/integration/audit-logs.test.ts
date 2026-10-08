// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as listAuditLogsRoute } from "@/app/api/admin/audit-logs/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import {
  AuditAction,
  AuditEntityType,
  OrderStatus,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";
import { setAdminUserStatus } from "@/services/admin-user.service";
import { updateAdminShop } from "@/services/admin-shop.service";
import { transitionOrderStatus } from "@/services/order-status.service";
import { updateProduct, updateProductStock } from "@/services/product.service";
import type { AuthenticatedUser } from "@/types/auth";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, token: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

async function login(email: string) {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password: "ChangeMe123!" }),
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

function authenticated(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  preferredLanguage: "EN" | "SI";
  status: UserStatus;
}): AuthenticatedUser {
  return user;
}

describeWithDatabase("sensitive action audit logging", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const entityIds: string[] = [];
  const userIds: string[] = [];
  let admin: AuthenticatedUser;
  let owner: AuthenticatedUser;
  let targetUserId = "";
  let shopId = "";
  let categoryId = "";
  let productId = "";
  let addressId = "";
  let rejectedOrderId = "";
  let adminToken = "";
  let customerToken = "";

  beforeAll(async () => {
    const seededAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@agstores.local" },
    });
    admin = authenticated(seededAdmin);
    [adminToken, customerToken] = await Promise.all([
      login("admin@agstores.local"),
      login("customer@agstores.local"),
    ]);

    const [ownerRecord, customer, target] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Audit Owner",
          email: `audit-owner-${suffix}@example.test`,
          passwordHash: "not-used-for-authentication",
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Audit Customer",
          email: `audit-customer-${suffix}@example.test`,
          passwordHash: "not-used-for-authentication",
          role: UserRole.CUSTOMER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Audit Managed User",
          email: `audit-target-${suffix}@example.test`,
          passwordHash: "SensitivePasswordHashThatMustNeverBeLogged",
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    owner = authenticated(ownerRecord);
    targetUserId = target.id;
    userIds.push(ownerRecord.id, customer.id, target.id);

    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `Audit Shop ${suffix}`,
        address: "1 Audit Road, Colombo",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: `+94${Date.now().toString().slice(-9)}`,
      },
    });
    shopId = shop.id;

    const category = await prisma.category.create({
      data: { shopId: shop.id, nameEn: `Audit Category ${suffix}` },
    });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: category.id,
        nameEn: `Audit Product ${suffix}`,
        price: "100.00",
        stockQuantity: 10,
      },
    });
    productId = product.id;

    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Audit address",
        address: "2 Audit Road, Colombo",
        latitude: "6.930000",
        longitude: "79.860000",
      },
    });
    addressId = address.id;
    const orderData = {
      customerId: customer.id,
      shopId: shop.id,
      deliveryAddressId: address.id,
      subtotal: "100.00",
      deliveryFee: "25.00",
      total: "125.00",
    };
    const rejectedOrder = await prisma.order.create({ data: orderData });
    rejectedOrderId = rejectedOrder.id;
    entityIds.push(product.id, rejectedOrder.id, target.id, shop.id);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [{ entityId: { in: entityIds } }, { actorId: { in: userIds } }],
      },
    });
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: { in: [adminToken, customerToken].map(hashSessionToken) },
      },
    });
    await prisma.notification.deleteMany({
      where: { orderId: rejectedOrderId },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: rejectedOrderId },
    });
    await prisma.order.deleteMany({ where: { id: rejectedOrderId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    await prisma.user.deleteMany({
      where: { id: { in: userIds.filter((id) => id !== owner.id) } },
    });
    await prisma.shop.deleteMany({ where: { id: shopId } });
    await prisma.user.deleteMany({ where: { id: owner.id } });
    await prisma.$disconnect();
  });

  it("writes audit records for important business and administrative actions", async () => {
    await updateProduct(owner, productId, {
      categoryId,
      nameEn: `Audit Product ${suffix}`,
      nameSi: null,
      descriptionEn: null,
      descriptionSi: null,
      price: "125.50",
      stockQuantity: 10,
      lowStockThreshold: 5,
      imageUrl: null,
      isAvailable: true,
    });
    await updateProductStock(owner, productId, {
      stockQuantity: 7,
      lowStockThreshold: 5,
    });
    await transitionOrderStatus(owner, rejectedOrderId, OrderStatus.REJECTED);
    await setAdminUserStatus(admin, targetUserId, {
      status: UserStatus.INACTIVE,
    });
    await updateAdminShop(admin, shopId, {
      ownerId: owner.id,
      name: `Updated Audit Shop ${suffix}`,
      address: "1 Audit Road, Colombo",
      latitude: 6.927079,
      longitude: 79.861244,
      phone: (await prisma.shop.findUniqueOrThrow({ where: { id: shopId } }))
        .phone,
      isOpen: true,
      minimumOrderAmount: "0.00",
      deliveryFee: "150.00",
      maximumDeliveryRadiusKm: "30.00",
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        AuditAction.PRODUCT_PRICE_UPDATED,
        AuditAction.PRODUCT_STOCK_UPDATED,
        AuditAction.ORDER_STATUS_CHANGED,
        AuditAction.USER_STATUS_UPDATED,
        AuditAction.SHOP_UPDATED,
      ]),
    );
    expect(
      logs.find(
        (log) =>
          log.entityId === rejectedOrderId &&
          log.action === AuditAction.ORDER_STATUS_CHANGED,
      ),
    ).toMatchObject({
      actorId: owner.id,
      entityType: AuditEntityType.ORDER,
      metadata: {
        previousStatus: OrderStatus.PLACED,
        newStatus: OrderStatus.REJECTED,
      },
    });
    expect(
      logs.find(
        (log) =>
          log.entityId === targetUserId &&
          log.action === AuditAction.USER_STATUS_UPDATED,
      ),
    ).toMatchObject({
      actorId: admin.id,
      entityType: AuditEntityType.USER,
    });
    expect(JSON.stringify(logs)).not.toMatch(
      /password|secret|token|cookie|authorization/i,
    );
  });

  it("allows administrators to view logs while rejecting normal users", async () => {
    const response = await listAuditLogsRoute(
      request(
        `/api/admin/audit-logs?entityType=${AuditEntityType.PRODUCT}`,
        adminToken,
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: owner.id,
          entityId: productId,
          entityType: AuditEntityType.PRODUCT,
        }),
      ]),
    );

    const forbidden = await listAuditLogsRoute(
      request("/api/admin/audit-logs", customerToken),
    );
    expect(forbidden.status).toBe(403);
  });
});
