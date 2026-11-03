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
import { createProduct, updateProduct } from "@/services/product.service";
import { checkout, getCustomerOrder } from "@/services/checkout.service";
import { getCustomerOrderDetails } from "@/services/customer-order.service";
import { getOwnerOrder } from "@/services/owner-order.service";
import { validateCartForCheckout } from "@/services/cart.service";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/validations/product";
import { checkoutSchema } from "@/validations/checkout";
import { cartValidationSchema } from "@/validations/cart";
import type { AuthenticatedUser } from "@/types/auth";
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("quantity discounts in database transactions", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url ?? "postgresql://unused@localhost:1/unused",
    }),
  });
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const categoryIds: string[] = [];
  let owner: AuthenticatedUser;
  let other: AuthenticatedUser;
  let customer: AuthenticatedUser;
  let addressId: string;
  let productId: string;
  let kgId: string;
  const tiers = [
    { minimumQuantity: 1, discountAmount: "5.00" },
    { minimumQuantity: 3, discountAmount: "7.00" },
    { minimumQuantity: 5, discountAmount: "10.00" },
  ];
  function actor(id: string, role: UserRole): AuthenticatedUser {
    return {
      id,
      role,
      name: "Discount Test",
      email: null,
      phone: null,
      status: UserStatus.ACTIVE,
      preferredLanguage: PreferredLanguage.EN,
    };
  }
  function input(overrides = {}) {
    return productCreateSchema.parse({
      shopId: shopIds[0],
      categoryId: categoryIds[0],
      nameEn: "Tier " + randomUUID(),
      itemCode: randomUUID(),
      price: "100.00",
      stockQuantity: 100,
      discountTiers: tiers,
      ...overrides,
    });
  }
  async function edit(overrides = {}) {
    const current = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    return productUpdateSchema.parse({
      categoryId: current.categoryId,
      nameEn: current.nameEn,
      itemCode: current.itemCode,
      price: current.price.toFixed(2),
      stockQuantity: Number(current.stockQuantity),
      sellingUnit: current.sellingUnit,
      minimumOrderQuantity: Number(current.minimumOrderQuantity),
      orderingIncrement: Number(current.orderingIncrement),
      ...overrides,
    });
  }
  const cart = (
    quantity: number,
    id = productId,
    unit: "UNIT" | "KG" = "UNIT",
  ) => ({ items: [{ productId: id, quantity, sellingUnit: unit }] });
  beforeAll(async () => {
    for (const role of [
      UserRole.SHOP_OWNER,
      UserRole.SHOP_OWNER,
      UserRole.CUSTOMER,
    ])
      userIds.push(
        (
          await prisma.user.create({
            data: {
              name: "Discount",
              email: `${randomUUID()}@example.test`,
              passwordHash: "test-only",
              role,
            },
          })
        ).id,
      );
    owner = actor(userIds[0]!, UserRole.SHOP_OWNER);
    other = actor(userIds[1]!, UserRole.SHOP_OWNER);
    customer = actor(userIds[2]!, UserRole.CUSTOMER);
    for (const ownerId of [owner.id, other.id]) {
      const shop = await prisma.shop.create({
        data: {
          ownerId,
          name: "Discount " + randomUUID(),
          address: "Test",
          phone: randomUUID().slice(0, 30),
          latitude: "6.9",
          longitude: "79.8",
          isOpen: true,
          deliveryFee: "0.00",
        },
      });
      shopIds.push(shop.id);
      categoryIds.push(
        (
          await prisma.category.create({
            data: { shopId: shop.id, nameEn: "Discount" },
          })
        ).id,
      );
    }
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Home",
          address: "Test",
          latitude: "6.9",
          longitude: "79.8",
        },
      })
    ).id;
    productId = (await createProduct(owner, input())).id;
    kgId = (
      await createProduct(
        owner,
        input({
          sellingUnit: "KG",
          discountTiers: [
            { minimumQuantity: 0.5, discountAmount: "5.00" },
            { minimumQuantity: 1, discountAmount: "7.00" },
            { minimumQuantity: 3, discountAmount: "10.00" },
          ],
        }),
      )
    ).id;
  });
  afterAll(async () => {
    const ids = (
      await prisma.order.findMany({
        where: { shopId: { in: shopIds } },
        select: { id: true },
      })
    ).map((o) => o.id);
    await prisma.notification.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: ids } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.product.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.customerAddress.deleteMany({
      where: { customerId: { in: userIds } },
    });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
  it("quotes every UNIT threshold from authoritative prices despite client tampering", async () => {
    for (const [quantity, unitPrice, lineTotal] of [
      [1, "95.00", "95.00"],
      [2, "95.00", "190.00"],
      [3, "93.00", "279.00"],
      [4, "93.00", "372.00"],
      [5, "90.00", "450.00"],
      [10, "90.00", "900.00"],
    ] as const) {
      const parsed = cartValidationSchema.parse({
        items: [
          {
            productId,
            quantity,
            sellingUnit: "UNIT",
            price: "0.01",
            unitPrice: "0.01",
            regularPrice: "0.01",
            discountTiers: [{ minimumQuantity: 1, discountAmount: "99.99" }],
          },
        ],
      });
      const quote = await validateCartForCheckout(parsed);
      expect(quote.items[0]).toMatchObject({
        regularPrice: "100.00",
        quantity,
        unitPrice,
        lineTotal,
      });
      expect(quote.subtotal).toBe(lineTotal);
    }
  });
  it("quotes typed KG thresholds without introducing quantity increments", async () => {
    for (const [quantity, discount] of [
      [0.499, "0.00"],
      [0.5, "5.00"],
      [0.501, "5.00"],
      [0.999, "5.00"],
      [1, "7.00"],
      [1.001, "7.00"],
      [2.999, "7.00"],
      [3, "10.00"],
      [3.001, "10.00"],
    ] as const)
      expect(
        (await validateCartForCheckout(cart(quantity, kgId, "KG"))).items[0]
          ?.appliedDiscount,
      ).toBe(discount);
    expect(
      (await validateCartForCheckout(cart(0.5, kgId, "KG"))).subtotal,
    ).toBe("47.50");
  });
  it("rounds discounted KG lines half up and snapshots the exact per-kg rate", async () => {
    const product = await createProduct(
      owner,
      input({
        sellingUnit: "KG",
        price: "10.02",
        stockQuantity: 2.5,
        discountTiers: [{ minimumQuantity: 0.5, discountAmount: "0.01" }],
      }),
    );
    const quote = await validateCartForCheckout(cart(0.5, product.id, "KG"));
    const order = await checkout(customer, {
      deliveryAddressId: addressId,
      ...cart(0.5, product.id, "KG"),
    });
    expect(quote.subtotal).toBe("5.01");
    expect(order.items[0]).toMatchObject({
      regularPrice: "10.02",
      appliedDiscount: "0.01",
      unitPrice: "10.01",
      lineTotal: "5.01",
      savings: "0.00",
      sellingUnit: "KG",
      quantity: 0.5,
    });
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
      ).stockQuantity.toString(),
    ).toBe("2");
  });
  it("saves authoritative snapshots and historical prices survive catalogue price/tier changes", async () => {
    const order = await checkout(
      customer,
      checkoutSchema.parse({
        deliveryAddressId: addressId,
        items: [
          {
            productId,
            quantity: 3,
            price: "0.01",
            unitPrice: "0.01",
            appliedDiscount: "99.99",
          },
        ],
      }),
    );
    expect(order.items[0]).toMatchObject({
      regularPrice: "100.00",
      appliedDiscount: "7.00",
      unitPrice: "93.00",
      quantity: 3,
      sellingUnit: "UNIT",
      lineTotal: "279.00",
      savings: "21.00",
    });
    const stored = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(stored.regularPrice?.toFixed(2)).toBe("100.00");
    expect(stored.appliedDiscount?.toFixed(2)).toBe("7.00");
    await updateProduct(
      owner,
      productId,
      await edit({
        price: "200.00",
        discountTiers: [{ minimumQuantity: 1, discountAmount: "20.00" }],
      }),
    );
    for (const history of [
      await getCustomerOrder(customer, order.id),
      await getCustomerOrderDetails(customer, order.id),
      await getOwnerOrder(owner, order.id),
    ]) {
      expect(history.subtotal).toBe("279.00");
      expect(history.items[0]).toMatchObject({
        regularPrice: "100.00",
        appliedDiscount: "7.00",
        unitPrice: "93.00",
        lineTotal: "279.00",
        savings: "21.00",
      });
    }
    expect((await validateCartForCheckout(cart(3))).subtotal).toBe("540.00");
  });
  it("validates retained tiers on price-only edits and rolls back the entire edit", async () => {
    const count = await prisma.auditLog.count({
      where: { entityId: productId },
    });
    await expect(
      updateProduct(owner, productId, await edit({ price: "10.00" })),
    ).rejects.toThrow("cannot exceed");
    const current = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { discountTiers: true },
    });
    expect(current.price.toFixed(2)).toBe("200.00");
    expect(current.discountTiers[0]?.discountAmount.toFixed(2)).toBe("20.00");
    expect(
      await prisma.auditLog.count({ where: { entityId: productId } }),
    ).toBe(count);
  });
  it("rejects another shop owner's tier edits and category moves", async () => {
    await expect(
      updateProduct(other, productId, await edit({ discountTiers: [] })),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    await expect(
      updateProduct(
        owner,
        productId,
        await edit({ categoryId: categoryIds[1], discountTiers: [] }),
      ),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    expect((await validateCartForCheckout(cart(3))).subtotal).toBe("540.00");
  });
  it("removes tiers atomically and audits both tiers-only edits and unchanged regular prices", async () => {
    await updateProduct(owner, productId, await edit({ discountTiers: [] }));
    expect(
      await prisma.productDiscountTier.count({ where: { productId } }),
    ).toBe(0);
    expect((await validateCartForCheckout(cart(3))).items[0]).toMatchObject({
      unitPrice: "200.00",
      appliedDiscount: "0.00",
      savings: "0.00",
      lineTotal: "600.00",
    });
    const logs = await prisma.auditLog.findMany({
      where: { entityId: productId, action: "PRODUCT_PRICE_UPDATED" },
      orderBy: { createdAt: "desc" },
    });
    expect(logs[0]?.metadata).toMatchObject({
      previousPrice: "200.00",
      newPrice: "200.00",
      previousTiers: [{ minimumQuantity: 1, discountAmount: "20.00" }],
      newTiers: [],
    });
  });
  it("uses the discounted subtotal for shop minimum orders and rolls stock back on failure", async () => {
    await updateProduct(
      owner,
      productId,
      await edit({ price: "100.00", discountTiers: tiers }),
    );
    await prisma.shop.update({
      where: { id: shopIds[0]! },
      data: { minimumOrderAmount: "280.00" },
    });
    const before = (
      await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    ).stockQuantity.toString();
    await expect(
      checkout(customer, { deliveryAddressId: addressId, ...cart(3) }),
    ).rejects.toMatchObject({ code: "MINIMUM_ORDER_NOT_MET" });
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: productId } })
      ).stockQuantity.toString(),
    ).toBe(before);
    await prisma.shop.update({
      where: { id: shopIds[0]! },
      data: { minimumOrderAmount: "279.00" },
    });
    expect(
      (await checkout(customer, { deliveryAddressId: addressId, ...cart(3) }))
        .subtotal,
    ).toBe("279.00");
  });
  it("retains unknown historical discounts without fabricating savings", async () => {
    const legacy = await prisma.order.create({
      data: {
        customerId: customer.id,
        shopId: shopIds[0]!,
        deliveryAddressId: addressId,
        subtotal: "80.00",
        deliveryFee: "0.00",
        total: "80.00",
        items: { create: { productId, quantity: 1, unitPrice: "80.00" } },
      },
    });
    expect(
      (await getCustomerOrder(customer, legacy.id)).items[0],
    ).toMatchObject({
      regularPrice: null,
      appliedDiscount: null,
      savings: null,
      unitPrice: "80.00",
      lineTotal: "80.00",
    });
  });
});
