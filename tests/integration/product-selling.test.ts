// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaClient,
  UserRole,
  UserStatus,
  PreferredLanguage,
} from "@/generated/prisma/client";
import {
  createProduct,
  updateProduct,
  updateProductStock,
  listOwnerProducts,
} from "@/services/product.service";
import { checkout, getCustomerOrder } from "@/services/checkout.service";
import { validateCartForCheckout } from "@/services/cart.service";
import { transitionOrderStatus } from "@/services/order-status.service";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/validations/product";
import type { AuthenticatedUser } from "@/types/auth";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
suite("stage 1 product selling database transactions", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl ?? "postgresql://unused@localhost:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const categoryIds: string[] = [];
  let owner: AuthenticatedUser;
  let otherOwner: AuthenticatedUser;
  let customer: AuthenticatedUser;
  let addressId: string;
  let kgId: string;
  let legacyId: string;
  function actor(id: string, role: UserRole): AuthenticatedUser {
    return {
      id,
      role,
      name: "Stage 1",
      email: null,
      phone: "+94770000000",
      firstName: "Test",
      lastName: "Owner",
      preferredLanguage: PreferredLanguage.EN,
      status: UserStatus.ACTIVE,
    };
  }
  function input(overrides = {}) {
    return productCreateSchema.parse({
      shopId: shopIds[0],
      categoryId: categoryIds[0],
      nameEn: "Rice " + randomUUID(),
      itemCode: "00001",
      barcode: "000009",
      price: "10.01",
      sellingUnit: "KG",
      minimumOrderQuantity: 0.25,
      orderingIncrement: 0.125,
      stockQuantity: 2.5,
      lowStockThreshold: 0.5,
      ...overrides,
    });
  }
  function updateInput(overrides = {}) {
    const data = input(overrides);
    const { shopId: _shopId, ...fields } = data;
    void _shopId;
    return productUpdateSchema.parse(fields);
  }
  function cart(quantity = 0.5) {
    return {
      items: [{ productId: kgId, quantity, sellingUnit: "KG" as const }],
    };
  }
  async function stock() {
    return (
      await prisma.product.findUniqueOrThrow({ where: { id: kgId } })
    ).stockQuantity.toString();
  }
  beforeAll(async () => {
    for (const role of [
      UserRole.SHOP_OWNER,
      UserRole.SHOP_OWNER,
      UserRole.CUSTOMER,
    ]) {
      const user = await prisma.user.create({
        data: {
          name: "Stage 1",
          firstName: "Stage",
          lastName: "One",
          phone: `+947${randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
          email: `stage1-${randomUUID()}@example.test`,
          passwordHash: "test-only",
          role,
        },
      });
      userIds.push(user.id);
    }
    owner = actor(userIds[0]!, UserRole.SHOP_OWNER);
    otherOwner = actor(userIds[1]!, UserRole.SHOP_OWNER);
    customer = actor(userIds[2]!, UserRole.CUSTOMER);
    for (const ownerId of [owner.id, otherOwner.id]) {
      const shop = await prisma.shop.create({
        data: {
          ownerId,
          name: "Stage 1 " + suffix,
          address: "Test",
          phone: randomUUID().slice(0, 30),
          latitude: 6.9,
          longitude: 79.8,
          isOpen: true,
          deliveryFee: "0.00",
        },
      });
      shopIds.push(shop.id);
      categoryIds.push(
        (
          await prisma.category.create({
            data: { shopId: shop.id, nameEn: "Stage 1" },
          })
        ).id,
      );
    }
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: suffix,
          address: "Test",
          latitude: 6.9,
          longitude: 79.8,
        },
      })
    ).id;
    kgId = (await createProduct(owner, input())).id;
    legacyId = (
      await prisma.product.create({
        data: {
          shopId: shopIds[0]!,
          categoryId: categoryIds[0]!,
          nameEn: "Legacy",
          price: "25.10",
          stockQuantity: 3,
        },
      })
    ).id;
  });
  afterAll(async () => {
    const orderWhere = { shopId: { in: shopIds } };
    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true },
    });
    const ids = orders.map((o) => o.id);
    await prisma.notification.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: ids } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: orderWhere });
    const products = await prisma.product.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: userIds } },
          { entityId: { in: [...ids, ...products.map((p) => p.id)] } },
        ],
      },
    });
    await prisma.product.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.customerAddress.deleteMany({
      where: { customerId: { in: userIds } },
    });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
  it("enforces separate identifiers per shop and owner-scoped search and writes", async () => {
    await expect(
      createProduct(owner, input({ barcode: "other" })),
    ).rejects.toMatchObject({ code: "DUPLICATE_PRODUCT", status: 409 });
    await expect(
      createProduct(owner, input({ itemCode: "other" })),
    ).rejects.toMatchObject({ code: "DUPLICATE_PRODUCT", status: 409 });
    await expect(
      createProduct(owner, input({ categoryId: categoryIds[1] })),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    await expect(
      updateProductStock(otherOwner, kgId, { stockQuantity: 0 }),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    const other = await createProduct(
      otherOwner,
      input({ shopId: shopIds[1], categoryId: categoryIds[1] }),
    );
    expect(other.itemCode).toBe("00001");
    expect(
      (await listOwnerProducts(owner, { search: "000009" })).map((p) => p.id),
    ).toEqual([kgId]);
    expect(
      (await listOwnerProducts(owner, { search: "00001" })).map((p) => p.id),
    ).toEqual([kgId]);
    for (const code of ["null-1", "null-2"])
      expect(
        (await createProduct(owner, input({ itemCode: code, barcode: "" })))
          .barcode,
      ).toBeNull();
  });
  it("keeps legacy products and historical UNIT orders compatible", async () => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: legacyId },
    });
    expect(product.itemCode).toBeNull();
    expect(product.barcode).toBeNull();
    expect(product.sellingUnit).toBe("UNIT");
    expect(product.minimumOrderQuantity.toString()).toBe("1");
    const result = await checkout(customer, {
      deliveryAddressId: addressId,
      items: [{ productId: legacyId, quantity: 1 }],
    });
    expect(result.subtotal).toBe("25.10");
    expect(result.items[0]?.sellingUnit).toBe("UNIT");
    await transitionOrderStatus(customer, result.id, "CANCELLED");
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: legacyId } })
      ).stockQuantity.toString(),
    ).toBe("3");
    await expect(
      updateProductStock(owner, legacyId, { stockQuantity: 1.5 }),
    ).rejects.toThrow("whole numbers");
  });
  it("rejects weights below 0.002kg, extra precision, and legacy cart unit assumptions", async () => {
    for (const quantity of [0, 0.001, 0.2501]) {
      await expect(
        validateCartForCheckout(cart(quantity)),
      ).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
      await expect(
        checkout(customer, { deliveryAddressId: addressId, ...cart(quantity) }),
      ).rejects.toThrow();
      expect(await stock()).toBe("2.5");
    }
    await expect(
      checkout(customer, {
        deliveryAddressId: addressId,
        items: [{ productId: kgId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
    expect(await stock()).toBe("2.5");
  });
  it("reserves fractional stock, quotes half-up totals, snapshots units, and restores once on cancellation", async () => {
    expect((await validateCartForCheckout(cart())).subtotal).toBe("5.01");
    const order = await checkout(customer, {
      deliveryAddressId: addressId,
      ...cart(),
    });
    expect(order.subtotal).toBe("5.01");
    expect(order.items[0]).toMatchObject({
      quantity: 0.5,
      sellingUnit: "KG",
      lineTotal: "5.01",
    });
    expect(await stock()).toBe("2");
    await expect(
      updateProduct(
        owner,
        kgId,
        updateInput({
          sellingUnit: "UNIT",
          minimumOrderQuantity: 1,
          orderingIncrement: 1,
          stockQuantity: 0,
          lowStockThreshold: 1,
        }),
      ),
    ).rejects.toThrow("zero stock");
    await updateProductStock(owner, kgId, { stockQuantity: 0 });
    await expect(
      updateProduct(
        owner,
        kgId,
        updateInput({
          sellingUnit: "UNIT",
          minimumOrderQuantity: 1,
          orderingIncrement: 1,
          stockQuantity: 0,
          lowStockThreshold: 1,
        }),
      ),
    ).rejects.toThrow("active orders");
    await transitionOrderStatus(customer, order.id, "CANCELLED");
    expect(await stock()).toBe("0.5");
    await expect(
      transitionOrderStatus(customer, order.id, "CANCELLED"),
    ).rejects.toThrow();
    expect(await stock()).toBe("0.5");
    await updateProductStock(owner, kgId, { stockQuantity: 0 });
    await updateProduct(
      owner,
      kgId,
      updateInput({
        sellingUnit: "UNIT",
        minimumOrderQuantity: 1,
        orderingIncrement: 1,
        stockQuantity: 0,
        lowStockThreshold: 1,
      }),
    );
    expect(
      (await getCustomerOrder(customer, order.id)).items[0]?.sellingUnit,
    ).toBe("KG");
    await updateProduct(owner, kgId, updateInput({ stockQuantity: 0 }));
    await updateProductStock(owner, kgId, {
      stockQuantity: 2.5,
      lowStockThreshold: 0.5,
    });
  });
  it("restores fractional stock on owner rejection", async () => {
    const order = await checkout(customer, {
      deliveryAddressId: addressId,
      ...cart(0.375),
    });
    expect(await stock()).toBe("2.125");
    await transitionOrderStatus(owner, order.id, "REJECTED");
    expect(await stock()).toBe("2.5");
  });
  it("rolls back a reservation when a later checkout check fails", async () => {
    const count = await prisma.order.count({ where: { shopId: shopIds[0]! } });
    await prisma.shop.update({
      where: { id: shopIds[0]! },
      data: { isOpen: false },
    });
    await expect(
      checkout(customer, { deliveryAddressId: addressId, ...cart() }),
    ).rejects.toMatchObject({ code: "SHOP_CLOSED" });
    expect(await stock()).toBe("2.5");
    expect(await prisma.order.count({ where: { shopId: shopIds[0]! } })).toBe(
      count,
    );
    await prisma.shop.update({
      where: { id: shopIds[0]! },
      data: { isOpen: true },
    });
  });
  it("rolls back earlier reservations when a later product cannot be reserved", async () => {
    const count = await prisma.order.count({ where: { shopId: shopIds[0]! } });
    await expect(
      checkout(customer, {
        deliveryAddressId: addressId,
        items: [
          ...cart().items,
          {
            productId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            quantity: 1,
            sellingUnit: "UNIT",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
    expect(await stock()).toBe("2.5");
    expect(await prisma.order.count({ where: { shopId: shopIds[0]! } })).toBe(
      count,
    );
  });
  it("prevents concurrent fractional overselling", async () => {
    await updateProductStock(owner, kgId, { stockQuantity: 0.5 });
    const results = await Promise.allSettled([
      checkout(customer, { deliveryAddressId: addressId, ...cart() }),
      checkout(customer, { deliveryAddressId: addressId, ...cart() }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stock()).toBe("0");
  });
});
