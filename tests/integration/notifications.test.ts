// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { PATCH as markReadRoute } from "@/app/api/notifications/[notificationId]/read/route";
import { PATCH as markAllReadRoute } from "@/app/api/notifications/read-all/route";
import { GET as notificationsRoute } from "@/app/api/notifications/route";
import {
  NotificationType,
  OrderStatus,
  PreferredLanguage,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";
import { checkout } from "@/services/checkout.service";
import {
  completeDeliveryOrder,
  startDeliveryBatch,
} from "@/services/delivery-batch-management.service";
import { createDeliveryBatch } from "@/services/delivery-batch.service";
import { transitionOrderStatus } from "@/services/order-status.service";
import type { AuthenticatedUser } from "@/types/auth";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function apiRequest(path: string, token: string, method = "GET") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

function notificationContext(notificationId: string) {
  return { params: Promise.resolve({ notificationId }) };
}

function actor(user: {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
}): AuthenticatedUser {
  return {
    ...user,
    phone: null,
    preferredLanguage: PreferredLanguage.EN,
    status: UserStatus.ACTIVE,
  };
}

describeWithDatabase("in-app order notifications", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const tokens: string[] = [];
  let owner: AuthenticatedUser;
  let customer: AuthenticatedUser;
  let rider: AuthenticatedUser;
  let unrelatedCustomer: AuthenticatedUser;
  let foreignRider: AuthenticatedUser;
  let customerToken = "";
  let unrelatedToken = "";
  let addressId = "";
  let categoryId = "";
  let productId = "";
  let orderId = "";
  let batchId = "";

  async function login(email: string) {
    const response = await loginRoute(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password: "ChangeMe123!" }),
      }),
    );
    const token = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    tokens.push(token);
    return token;
  }

  beforeAll(async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const [ownerRecord, foreignOwnerRecord, customerRecord, unrelatedRecord] =
      await Promise.all([
        prisma.user.create({
          data: {
            name: "Notification Owner",
            email: `notification-owner-${suffix}@example.test`,
            passwordHash,
            role: UserRole.SHOP_OWNER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Foreign Notification Owner",
            email: `notification-foreign-owner-${suffix}@example.test`,
            passwordHash,
            role: UserRole.SHOP_OWNER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Notification Customer",
            email: `notification-customer-${suffix}@example.test`,
            passwordHash,
            role: UserRole.CUSTOMER,
          },
        }),
        prisma.user.create({
          data: {
            name: "Unrelated Customer",
            email: `notification-unrelated-${suffix}@example.test`,
            passwordHash,
            role: UserRole.CUSTOMER,
          },
        }),
      ]);
    userIds.push(
      ownerRecord.id,
      foreignOwnerRecord.id,
      customerRecord.id,
      unrelatedRecord.id,
    );

    const [shop, foreignShop] = await Promise.all([
      prisma.shop.create({
        data: {
          ownerId: ownerRecord.id,
          name: `Notification Shop ${suffix}`,
          address: "10 Notification Road, Colombo",
          phone: `+9417${suffix.replace(/\D/g, "").padEnd(8, "1").slice(0, 8)}`,
          latitude: "6.927079",
          longitude: "79.861244",
          isOpen: true,
        },
      }),
      prisma.shop.create({
        data: {
          ownerId: foreignOwnerRecord.id,
          name: `Foreign Notification Shop ${suffix}`,
          address: "20 Foreign Road, Colombo",
          phone: `+9418${suffix.replace(/\D/g, "").padEnd(8, "2").slice(0, 8)}`,
          latitude: "6.900000",
          longitude: "79.850000",
          isOpen: true,
        },
      }),
    ]);
    shopIds.push(shop.id, foreignShop.id);

    const [riderRecord, foreignRiderRecord] = await Promise.all([
      prisma.user.create({
        data: {
          assignedShopId: shop.id,
          name: "Notification Rider",
          email: `notification-rider-${suffix}@example.test`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          assignedShopId: foreignShop.id,
          name: "Foreign Notification Rider",
          email: `notification-foreign-rider-${suffix}@example.test`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
    ]);
    userIds.push(riderRecord.id, foreignRiderRecord.id);

    owner = actor(ownerRecord);
    customer = actor(customerRecord);
    rider = actor(riderRecord);
    unrelatedCustomer = actor(unrelatedRecord);
    foreignRider = actor(foreignRiderRecord);
    customerToken = await login(customer.email ?? "");
    unrelatedToken = await login(unrelatedCustomer.email ?? "");

    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Home",
          address: "12 Notification Road, Colombo",
          latitude: "6.927500",
          longitude: "79.862000",
        },
      })
    ).id;
    categoryId = (
      await prisma.category.create({
        data: { shopId: shop.id, nameEn: `Notification Category ${suffix}` },
      })
    ).id;
    productId = (
      await prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId,
          nameEn: `Notification Product ${suffix}`,
          price: "100.00",
          stockQuantity: 10,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (batchId) {
      await prisma.deliveryBatchOrder.deleteMany({ where: { batchId } });
    }
    if (orderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (batchId)
      await prisma.deliveryBatch.deleteMany({ where: { id: batchId } });
    if (productId)
      await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryId)
      await prisma.category.deleteMany({ where: { id: categoryId } });
    if (addressId)
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    await prisma.authSession.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { tokenHash: { in: tokens.filter(Boolean).map(hashSessionToken) } },
        ],
      },
    });
    await prisma.user.updateMany({
      where: { id: { in: userIds }, role: UserRole.DELIVERY_PERSON },
      data: { assignedShopId: null },
    });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("creates order-placed notifications only for the customer and shop owner", async () => {
    const order = await checkout(customer, {
      deliveryAddressId: addressId,
      items: [{ productId, quantity: 1 }],
    });
    orderId = order.id;

    const records = await prisma.notification.findMany({
      where: { orderId, type: NotificationType.ORDER_PLACED },
      orderBy: { userId: "asc" },
    });
    expect(new Set(records.map(({ userId }) => userId))).toEqual(
      new Set([customer.id, owner.id]),
    );
    expect(records.map(({ userId }) => userId)).not.toContain(
      unrelatedCustomer.id,
    );
  });

  it("creates the expected notifications for every delivery lifecycle event", async () => {
    await transitionOrderStatus(owner, orderId, OrderStatus.CONFIRMED);
    await transitionOrderStatus(owner, orderId, OrderStatus.PREPARING);
    await transitionOrderStatus(owner, orderId, OrderStatus.READY_FOR_DELIVERY);
    const batch = await createDeliveryBatch(rider, { orderIds: [orderId] });
    batchId = batch.id;
    await startDeliveryBatch(rider, batch.id);
    await completeDeliveryOrder(rider, batch.id, orderId, {
      status: OrderStatus.DELIVERED,
    });

    const customerTypes = await prisma.notification.findMany({
      where: { userId: customer.id, orderId },
      orderBy: { createdAt: "asc" },
      select: { type: true },
    });
    expect(new Set(customerTypes.map(({ type }) => type))).toEqual(
      new Set([
        NotificationType.ORDER_PLACED,
        NotificationType.ORDER_CONFIRMED,
        NotificationType.ORDER_READY_FOR_DELIVERY,
        NotificationType.ORDER_ASSIGNED,
        NotificationType.ORDER_OUT_FOR_DELIVERY,
        NotificationType.ORDER_DELIVERED,
      ]),
    );
    expect(
      await prisma.notification.count({
        where: { userId: rider.id, orderId },
      }),
    ).toBe(2);
    expect(
      await prisma.notification.count({
        where: { userId: foreignRider.id, orderId },
      }),
    ).toBe(0);
    expect(
      await prisma.notification.count({
        where: { userId: unrelatedCustomer.id, orderId },
      }),
    ).toBe(0);
  });

  it("isolates lists and unread counts by authenticated user", async () => {
    const customerResponse = await notificationsRoute(
      apiRequest("/api/notifications", customerToken),
    );
    const customerPayload = await customerResponse.json();
    expect(customerResponse.status).toBe(200);
    expect(customerPayload.data.unreadCount).toBe(6);
    expect(customerPayload.data.notifications).toHaveLength(6);

    const unrelatedResponse = await notificationsRoute(
      apiRequest("/api/notifications", unrelatedToken),
    );
    expect((await unrelatedResponse.json()).data).toMatchObject({
      notifications: [],
      unreadCount: 0,
    });
  });

  it("marks one owned notification and all remaining notifications as read", async () => {
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: customer.id, orderId, readAt: null },
    });
    const denied = await markReadRoute(
      apiRequest(
        `/api/notifications/${notification.id}/read`,
        unrelatedToken,
        "PATCH",
      ),
      notificationContext(notification.id),
    );
    expect(denied.status).toBe(404);

    const marked = await markReadRoute(
      apiRequest(
        `/api/notifications/${notification.id}/read`,
        customerToken,
        "PATCH",
      ),
      notificationContext(notification.id),
    );
    expect(marked.status).toBe(200);
    expect((await marked.json()).data.readAt).toEqual(expect.any(String));

    const afterOne = await notificationsRoute(
      apiRequest("/api/notifications", customerToken),
    );
    expect((await afterOne.json()).data.unreadCount).toBe(5);

    const markedAll = await markAllReadRoute(
      apiRequest("/api/notifications/read-all", customerToken, "PATCH"),
    );
    expect(markedAll.status).toBe(200);
    expect((await markedAll.json()).data.updatedCount).toBe(5);

    const afterAll = await notificationsRoute(
      apiRequest("/api/notifications", customerToken),
    );
    expect((await afterAll.json()).data.unreadCount).toBe(0);
  });
});
