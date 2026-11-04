import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";
import { PrismaClient, UserRole } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const suffix = randomUUID();
let ownerId = "",
  customerId = "",
  shopId = "",
  categoryId = "",
  productId = "",
  addressId = "",
  orderId = "";
const email = `packed-${suffix}@example.test`;

test.beforeAll(async () => {
  ownerId = (
    await prisma.user.create({
      data: {
        name: "Packing owner",
        email,
        passwordHash: await hashPassword("ChangeMe123!"),
        role: UserRole.SHOP_OWNER,
      },
    })
  ).id;
  customerId = (
    await prisma.user.create({
      data: {
        name: "Packing customer",
        email: `packed-customer-${suffix}@example.test`,
        passwordHash: await hashPassword("ChangeMe123!"),
        role: UserRole.CUSTOMER,
      },
    })
  ).id;
  shopId = (
    await prisma.shop.create({
      data: {
        ownerId,
        name: `Packing E2E ${suffix}`,
        address: "Test",
        phone: `+947${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
        latitude: "6.9",
        longitude: "79.8",
        isOpen: true,
        deliveryFee: "20.00",
      },
    })
  ).id;
  categoryId = (
    await prisma.category.create({ data: { shopId, nameEn: "Packing" } })
  ).id;
  productId = (
    await prisma.product.create({
      data: {
        shopId,
        categoryId,
        nameEn: "Packing rice",
        itemCode: suffix,
        price: "200.00",
        sellingUnit: "KG",
        minimumOrderQuantity: "0.002",
        orderingIncrement: "0.001",
        stockQuantity: "8.000",
      },
    })
  ).id;
  addressId = (
    await prisma.customerAddress.create({
      data: {
        customerId,
        label: "Packing",
        address: "Test",
        latitude: "6.9",
        longitude: "79.8",
      },
    })
  ).id;
  orderId = (
    await prisma.order.create({
      data: {
        customerId,
        shopId,
        deliveryAddressId: addressId,
        status: "PREPARING",
        subtotal: "360.00",
        estimatedSubtotal: "360.00",
        deliveryFee: "20.00",
        total: "380.00",
        estimatedTotal: "380.00",
        packingRequired: true,
        items: {
          create: {
            productId,
            quantity: "2.000",
            sellingUnit: "KG",
            regularPrice: "200.00",
            appliedDiscount: "20.00",
            unitPrice: "180.00",
          },
        },
      },
    })
  ).id;
});

test.afterAll(async () => {
  if (orderId) {
    await prisma.notification.deleteMany({ where: { orderId } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.auditLog.deleteMany({ where: { entityId: orderId } });
  }
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  if (categoryId)
    await prisma.category.deleteMany({ where: { id: categoryId } });
  if (addressId)
    await prisma.customerAddress.deleteMany({ where: { id: addressId } });
  if (shopId) await prisma.shop.deleteMany({ where: { id: shopId } });
  await prisma.authSession.deleteMany({
    where: { userId: { in: [ownerId, customerId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, customerId] } },
  });
  await prisma.$disconnect();
});

test("owner previews, saves and finalizes a packed KG order", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByLabel("Email or phone").fill(email);
  await page.locator("#login-password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);
  await page.goto(`/owner/orders/${orderId}`);
  const ready = page.getByRole("button", { name: "Mark ready for delivery" });
  await expect(ready).toBeDisabled();
  await page.getByLabel("Actual packed weight (kg)").fill("1.98");
  await expect(page.getByText(/New line amount.*356\.40/)).toBeVisible();
  await expect(page.getByText(/New order total.*376\.40/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm packed weight" }).click();
  await expect(ready).toBeEnabled();
  await expect
    .poll(async () =>
      (
        await prisma.product.findUniqueOrThrow({ where: { id: productId } })
      ).stockQuantity.toString(),
    )
    .toBe("8.02");
  await ready.click();
  await expect(
    page.getByText("Ready for delivery", { exact: true }).first(),
  ).toBeVisible();
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  expect(order.total.toFixed(2)).toBe("376.40");
  expect(order.estimatedTotal?.toFixed(2)).toBe("380.00");
  expect(order.items[0]?.quantity.toString()).toBe("2");
  expect(order.items[0]?.packedQuantity?.toString()).toBe("1.98");
});
