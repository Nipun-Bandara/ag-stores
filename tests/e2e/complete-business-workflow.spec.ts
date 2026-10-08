import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  CatalogStatus,
  DeliveryBatchStatus,
  OrderStatus,
  PrismaClient,
  UserRole,
} from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const shortSuffix = suffix.slice(0, 8);
const password = "WorkflowPassword123!";
const customerEmail = `workflow-customer-${suffix}@example.test`;
const ownerEmail = `workflow-owner-${suffix}@example.test`;
const riderEmail = `workflow-rider-${suffix}@example.test`;
const otherRiderEmail = `workflow-other-rider-${suffix}@example.test`;
const shopName = `Workflow Market ${shortSuffix}`;
const categoryName = `Workflow Category ${shortSuffix}`;
const mainProductName = `Workflow Tea ${shortSuffix}`;
const stockProductName = `Workflow Limited Item ${shortSuffix}`;
const auxiliaryProductName = `Workflow Auxiliary Item ${shortSuffix}`;

const createdOrderIds: string[] = [];
let ownerId = "";
let riderId = "";
let otherRiderId = "";
let customerId = "";
let shopId = "";
let categoryId = "";
let mainProductId = "";
let stockProductId = "";
let auxiliaryProductId = "";
let addressId = "";
let mainOrderId = "";

async function signIn(
  page: Page,
  email: string,
  expectedPath: string,
  accountPassword = password,
) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill(accountPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

async function createDirectOrder(status: OrderStatus, productId?: string) {
  const product = productId ?? auxiliaryProductId;
  const order = await prisma.order.create({
    data: {
      customerId,
      shopId,
      deliveryAddressId: addressId,
      status,
      subtotal: "50.00",
      deliveryFee: "25.00",
      total: "75.00",
      items: {
        create: {
          productId: product,
          quantity: 1,
          unitPrice: "50.00",
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  return order.id;
}

test.describe.serial("complete retail order and delivery workflow", () => {
  test.beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const [owner, rider, otherRider] = await Promise.all([
      prisma.user.create({
        data: {
          name: `Workflow Owner ${shortSuffix}`,
          email: ownerEmail,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: `Workflow Rider ${shortSuffix}`,
          email: riderEmail,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          name: `Workflow Other Rider ${shortSuffix}`,
          email: otherRiderEmail,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
    ]);
    ownerId = owner.id;
    riderId = rider.id;
    otherRiderId = otherRider.id;

    const shop = await prisma.shop.create({
      data: {
        ownerId,
        name: shopName,
        address: "100 Workflow Road, Colombo",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: `+9411${suffix.replace(/\D/g, "").padEnd(8, "7").slice(0, 8)}`,
        isOpen: true,
        minimumOrderAmount: "0.00",
        deliveryFee: "25.00",
        maximumDeliveryRadiusKm: "100.00",
      },
    });
    shopId = shop.id;
    await prisma.user.updateMany({
      where: { id: { in: [riderId, otherRiderId] } },
      data: { assignedShopId: shopId },
    });

    const category = await prisma.category.create({
      data: {
        shopId,
        nameEn: categoryName,
        nameSi: "පරීක්ෂණ කාණ්ඩය",
        status: CatalogStatus.ACTIVE,
      },
    });
    categoryId = category.id;
    const [mainProduct, stockProduct, auxiliaryProduct] = await Promise.all([
      prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: mainProductName,
          descriptionEn: "Isolated full-workflow product",
          price: "123.00",
          stockQuantity: 100,
          isAvailable: true,
        },
      }),
      prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: stockProductName,
          price: "10.00",
          stockQuantity: 1,
          isAvailable: true,
        },
      }),
      prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: auxiliaryProductName,
          price: "50.00",
          stockQuantity: 100,
          isAvailable: true,
        },
      }),
    ]);
    mainProductId = mainProduct.id;
    stockProductId = stockProduct.id;
    auxiliaryProductId = auxiliaryProduct.id;
  });

  test.afterAll(async () => {
    const assignments = await prisma.deliveryBatchOrder.findMany({
      where: { orderId: { in: createdOrderIds } },
      select: { batchId: true },
    });
    const batchIds = [...new Set(assignments.map(({ batchId }) => batchId))];

    await prisma.notification.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    await prisma.deliveryBatchOrder.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    if (batchIds.length > 0) {
      await prisma.deliveryBatch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: [ownerId, riderId, otherRiderId].filter(Boolean) } },
          { entityId: { in: createdOrderIds } },
        ],
      },
    });
    if (addressId) {
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    }
    if (customerId) {
      await prisma.authSession.deleteMany({ where: { userId: customerId } });
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    await prisma.product.deleteMany({
      where: {
        id: {
          in: [mainProductId, stockProductId, auxiliaryProductId].filter(
            Boolean,
          ),
        },
      },
    });
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    await prisma.authSession.deleteMany({
      where: {
        userId: { in: [ownerId, riderId, otherRiderId].filter(Boolean) },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [riderId, otherRiderId].filter(Boolean) } },
    });
    if (shopId) await prisma.shop.deleteMany({ where: { id: shopId } });
    if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  test("customer, owner, rider, and customer complete the full workflow", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill(`Workflow Customer ${shortSuffix}`);
    await page.getByLabel("Email").fill(customerEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Preferred language").selectOption("EN");
    await page.getByRole("button", { name: "Create customer account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.getByRole("button", { name: "Sign out" }).click();

    await signIn(page, customerEmail, "/account");
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: customerEmail },
    });
    customerId = customer.id;

    await page.goto("/account/addresses");
    await page.getByLabel("Label").fill("Workflow Home");
    await page
      .getByLabel("Address", { exact: true })
      .fill("101 Workflow Customer Lane, Colombo");
    await page.getByLabel("Latitude").fill("6.927100");
    await page.getByLabel("Longitude").fill("79.861300");
    await page.getByLabel("Use as default address").check();
    await page.getByRole("button", { name: "Add address" }).click();
    await expect(page.getByText("101 Workflow Customer Lane")).toBeVisible();
    addressId = (
      await prisma.customerAddress.findFirstOrThrow({
        where: { customerId, label: "Workflow Home" },
      })
    ).id;

    await page.goto("/products");
    await page.getByLabel("Search products").fill(mainProductName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    const productCard = page
      .getByTestId("product-card")
      .filter({ hasText: mainProductName });
    await expect(productCard).toBeVisible();
    await productCard.getByRole("link", { name: "View product" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: mainProductName }),
    ).toBeVisible();
    await page.goto("/products");
    await page.getByLabel("Search products").fill(mainProductName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await page
      .getByTestId("product-card")
      .filter({ hasText: mainProductName })
      .getByRole("button", { name: `Add ${mainProductName} to cart` })
      .click();

    await page.goto("/cart");
    await expect(page.getByText(mainProductName)).toBeVisible();
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await page.getByLabel("Workflow Home").check();
    await expect(page.getByTestId("checkout-subtotal")).toHaveText(
      "LKR 123.00",
    );
    await expect(page.getByTestId("checkout-total")).toHaveText("LKR 148.00");
    await page
      .getByRole("button", { name: "Confirm Cash on Delivery order" })
      .click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
    mainOrderId = page.url().split("/").at(-1) ?? "";
    createdOrderIds.push(mainOrderId);
    await expect(
      page.getByRole("heading", { name: "Thank you for your order" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Track this order" }).click();
    await expect(page.getByTestId("customer-order-status")).toHaveText(
      "Placed",
    );

    await signIn(page, ownerEmail, "/owner");
    await page.goto(`/owner/orders?orderNumber=${mainOrderId}`);
    const ownerOrderCard = page
      .getByTestId("owner-order-card")
      .filter({ hasText: mainOrderId });
    await expect(ownerOrderCard).toBeVisible();
    await ownerOrderCard.getByRole("link", { name: "View order" }).click();
    await page.getByRole("button", { name: "Confirm order" }).click();
    await expect(
      page.getByText("Confirmed", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark preparing" }).click();
    await expect(
      page.getByText("Preparing", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark ready for delivery" }).click();
    await expect(
      page.getByText("Ready for delivery", { exact: true }).first(),
    ).toBeVisible();

    await signIn(page, riderEmail, "/delivery");
    await page.goto("/delivery/orders");
    await expect(page.getByText(mainOrderId, { exact: true })).toBeVisible();
    await page.getByLabel(`Select order ${mainOrderId}`).check();
    await page.getByRole("button", { name: "Create delivery batch" }).click();
    await expect(page.getByRole("status")).toContainText(
      "created with 1 order",
    );
    const assignment = await prisma.deliveryBatchOrder.findUniqueOrThrow({
      where: { orderId: mainOrderId },
    });
    await page.goto(`/delivery/batches/${assignment.batchId}`);
    await page.getByRole("button", { name: "Start delivery" }).click();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();

    await signIn(page, customerEmail, "/account");
    await page.goto(`/account/orders/${mainOrderId}`);
    await expect(page.getByTestId("customer-order-status")).toHaveText(
      "Delivered",
    );
    await expect(page.getByText(mainProductName)).toBeVisible();

    await signIn(page, ownerEmail, "/owner");
    await page.goto(`/owner/orders/${mainOrderId}`);
    await expect(
      page.getByText("Delivered", { exact: true }).first(),
    ).toBeVisible();
  });

  test("rejects invalid login and unauthorized role access", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email or phone").fill(customerEmail);
    await page.getByLabel("Password").fill("DefinitelyWrong123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Invalid email/phone or password.", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await signIn(page, customerEmail, "/account");
    const apiStatus = await page.evaluate(async () =>
      fetch("/api/owner/orders").then((response) => response.status),
    );
    expect(apiStatus).toBe(403);
    await page.goto("/owner/orders");
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test("rejects insufficient stock and checkout from a closed shop", async ({
    page,
  }) => {
    await signIn(page, customerEmail, "/account");
    const insufficient = await page.evaluate(
      async ({ deliveryAddressId, productId }) => {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryAddressId,
            items: [{ productId, quantity: 2 }],
          }),
        });
        return { status: response.status, body: await response.json() };
      },
      { deliveryAddressId: addressId, productId: stockProductId },
    );
    expect(insufficient.status).toBe(409);
    expect(insufficient.body.error.code).toBe("INSUFFICIENT_STOCK");
    await expect(
      prisma.product.findUniqueOrThrow({ where: { id: stockProductId } }),
    ).resolves.toMatchObject({ stockQuantity: 1 });

    await prisma.shop.update({
      where: { id: shopId },
      data: { isOpen: false },
    });
    const closed = await page.evaluate(
      async ({ deliveryAddressId, productId }) => {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryAddressId,
            items: [{ productId, quantity: 1 }],
          }),
        });
        return { status: response.status, body: await response.json() };
      },
      { deliveryAddressId: addressId, productId: auxiliaryProductId },
    );
    await prisma.shop.update({ where: { id: shopId }, data: { isOpen: true } });
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe("SHOP_CLOSED");
  });

  test("supports placed cancellation and blocks confirmed cancellation and invalid transitions", async ({
    page,
  }) => {
    const placedOrderId = await createDirectOrder(OrderStatus.PLACED);
    const confirmedOrderId = await createDirectOrder(OrderStatus.CONFIRMED);

    await signIn(page, customerEmail, "/account");
    await page.goto(`/account/orders/${placedOrderId}`);
    await page
      .getByLabel("Cancellation reason (optional)")
      .fill("Workflow cancellation test");
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByTestId("customer-order-status")).toHaveText(
      "Cancelled",
    );

    const cancellationStatus = await page.evaluate(async (orderId) => {
      const response = await fetch(`/api/account/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      return response.status;
    }, confirmedOrderId);
    expect(cancellationStatus).toBe(409);

    await signIn(page, ownerEmail, "/owner");
    const invalidTransition = await page.evaluate(async (orderId) => {
      const response = await fetch(`/api/owner/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      return response.status;
    }, confirmedOrderId);
    expect(invalidTransition).toBe(409);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: confirmedOrderId } }),
    ).resolves.toMatchObject({ status: OrderStatus.CONFIRMED });
  });

  test("prevents duplicate claims and completes a failed delivery", async ({
    page,
  }) => {
    const assignedOrderId = await createDirectOrder(OrderStatus.ASSIGNED);
    const existingBatch = await prisma.deliveryBatch.create({
      data: {
        deliveryPersonId: otherRiderId,
        orders: { create: { orderId: assignedOrderId, sequence: 1 } },
      },
    });
    const failedOrderId = await createDirectOrder(
      OrderStatus.READY_FOR_DELIVERY,
    );

    await signIn(page, riderEmail, "/delivery");
    const claimAttempt = await page.evaluate(async (orderId) => {
      const response = await fetch("/api/delivery/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [orderId] }),
      });
      return response.status;
    }, assignedOrderId);
    expect(claimAttempt).toBe(409);
    await expect(
      prisma.deliveryBatchOrder.findUniqueOrThrow({
        where: { orderId: assignedOrderId },
      }),
    ).resolves.toMatchObject({ batchId: existingBatch.id });

    await page.goto("/delivery/orders");
    await page.getByLabel(`Select order ${failedOrderId}`).check();
    await page.getByRole("button", { name: "Create delivery batch" }).click();
    await expect(page.getByRole("status")).toContainText(
      "created with 1 order",
    );
    const failedAssignment = await prisma.deliveryBatchOrder.findUniqueOrThrow({
      where: { orderId: failedOrderId },
    });
    await page.goto(`/delivery/batches/${failedAssignment.batchId}`);
    await page.getByRole("button", { name: "Start delivery" }).click();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark failed" }).click();
    await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: failedOrderId } }),
    ).resolves.toMatchObject({ status: OrderStatus.FAILED_DELIVERY });
    await expect(
      prisma.deliveryBatch.findUniqueOrThrow({
        where: { id: failedAssignment.batchId },
      }),
    ).resolves.toMatchObject({ status: DeliveryBatchStatus.COMPLETED });
  });
});
