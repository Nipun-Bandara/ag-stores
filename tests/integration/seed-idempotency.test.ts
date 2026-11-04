// @vitest-environment node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";
const databaseUrl = process.env.TEST_DATABASE_URL;
const run = promisify(execFile);
(databaseUrl ? describe : describe.skip)("development account seed", () => {
  it("preserves existing UUIDs, credentials and assignments across repeated seeds", async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl! }),
    });
    const emails = [
      "admin@agstores.local",
      "owner@agstores.local",
      "delivery@agstores.local",
      "customer@agstores.local",
    ];
    const before = await prisma.user.findMany({
      where: { email: { in: emails } },
      orderBy: { email: "asc" },
    });
    expect(before).toHaveLength(4);
    const customer = before.find((user) => user.role === "CUSTOMER")!;
    const product = await prisma.product.findFirstOrThrow({
      where: {
        nameEn: "Ceylon Tea",
        shop: { owner: { developmentFixtureKey: "owner" } },
      },
    });
    const changedPhone = `+9476${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
    try {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: "123.45", stockQuantity: 7 },
      });
      await prisma.user.update({
        where: { id: customer.id },
        data: {
          passwordHash: "custom-existing-credential",
          phone: changedPhone,
          email: null,
        },
      });
      for (let index = 0; index < 2; index++)
        await run(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl!,
            ALLOW_DEV_SEED: "1",
          },
        });
      const after = await prisma.user.findMany({
        where: {
          developmentFixtureKey: {
            in: ["admin", "owner", "delivery", "customer"],
          },
        },
        orderBy: { id: "asc" },
      });
      expect(
        after.map(({ id, assignedShopId }) => ({ id, assignedShopId })),
      ).toEqual(
        [...before]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(({ id, assignedShopId }) => ({ id, assignedShopId })),
      );
      expect(after.find((user) => user.id === customer.id)?.passwordHash).toBe(
        "custom-existing-credential",
      );
      expect(after.find((user) => user.id === customer.id)).toMatchObject({
        phone: changedPhone,
        email: null,
      });
      const preservedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(preservedProduct.price.toString()).toBe("123.45");
      expect(preservedProduct.stockQuantity).toBe(7);
    } finally {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: product.price, stockQuantity: product.stockQuantity },
      });
      await prisma.user.update({
        where: { id: customer.id },
        data: {
          passwordHash: customer.passwordHash,
          phone: customer.phone,
          email: customer.email,
        },
      });
      await prisma.$disconnect();
    }
  }, 30000);
});
