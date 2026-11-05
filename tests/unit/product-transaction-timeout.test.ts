import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProductRepository } from "@/repositories/product.repository";

describe("product write transactions", () => {
  it("allows time for a KG product photo attachment and audit write", async () => {
    const transaction = vi.fn(async (...args: unknown[]) => {
      expect(args[1]).toMatchObject({ timeout: 20_000 });
      throw new Error("transaction stub");
    });
    const repository = new PrismaProductRepository({
      $transaction: transaction,
    } as unknown as PrismaClient);

    await expect(
      repository.create(
        {
          shopId: "00000000-0000-4000-8000-000000000001",
          categoryId: "00000000-0000-4000-8000-000000000002",
          itemCode: "KG-001",
          barcode: null,
          nameEn: "Rice",
          nameSi: null,
          descriptionEn: null,
          descriptionSi: null,
          price: "100.00",
          sellingUnit: "KG",
          minimumOrderQuantity: 0.002,
          orderingIncrement: 0.001,
          stockQuantity: 1.5,
          lowStockThreshold: 0.5,
          imageUrl: null,
          imageUploadId: "00000000-0000-4000-8000-000000000003",
          isAvailable: true,
        },
        "00000000-0000-4000-8000-000000000004",
      ),
    ).rejects.toThrow("transaction stub");
    expect(transaction).toHaveBeenCalledOnce();
  });
});
