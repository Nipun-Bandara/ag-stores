// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaOrderStatusRepository } from "@/repositories/order-status.repository";

function setup() {
  const execute = vi.fn().mockResolvedValue(2);
  const transaction = { $executeRaw: execute };
  const run = vi.fn(async (operation) => operation(transaction));
  const repository = new PrismaOrderStatusRepository({
    $transaction: run,
  } as unknown as PrismaClient);
  return { execute, run, repository };
}

describe("order cancellation stock restoration", () => {
  it("restores all items in one parameterized query with packed weight and sufficient transaction time", async () => {
    const { repository, execute, run } = setup();
    await repository.transaction((tx) =>
      tx.restoreStock([
        {
          productId: "25a78b7c-4587-4bb7-aeae-3184cd823f48",
          quantity: new Prisma.Decimal("0.250"),
          packedQuantity: new Prisma.Decimal("0.275"),
        },
        {
          productId: "9edec432-0143-4e92-8c33-ed8aa3a769c8",
          quantity: 2,
          packedQuantity: null,
        },
      ]),
    );
    expect(run).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(execute).toHaveBeenCalledOnce();
    const sql = execute.mock.calls[0]![0] as Prisma.Sql;
    expect(sql.text).toContain('UPDATE "products"');
    expect(sql.text).toContain('"updatedAt"');
    expect(sql.text).not.toContain("0.275");
    expect(sql.values).toEqual([
      expect.any(Date),
      "25a78b7c-4587-4bb7-aeae-3184cd823f48",
      "0.275",
      "9edec432-0143-4e92-8c33-ed8aa3a769c8",
      "2",
    ]);
  });

  it("preserves a zero packed quantity and skips empty restorations", async () => {
    const { repository, execute } = setup();
    execute.mockResolvedValue(1);
    await repository.transaction((tx) => tx.restoreStock([]));
    expect(execute).not.toHaveBeenCalled();
    await repository.transaction((tx) =>
      tx.restoreStock([
        {
          productId: "25a78b7c-4587-4bb7-aeae-3184cd823f48",
          quantity: 0.25,
          packedQuantity: new Prisma.Decimal(0),
        },
      ]),
    );
    const sql = execute.mock.calls[0]![0] as Prisma.Sql;
    expect(sql.values.at(-1)).toBe("0");
  });

  it("fails the transaction if not every product is restored or the stock update fails", async () => {
    const { repository, execute } = setup();
    const restore = () =>
      repository.transaction((tx) =>
        tx.restoreStock([
          { productId: "25a78b7c-4587-4bb7-aeae-3184cd823f48", quantity: 2 },
        ]),
      );
    execute.mockResolvedValue(0);
    await expect(restore()).rejects.toThrow("Unable to restore stock");
    const failure = new Error("Stock update failed");
    execute.mockRejectedValue(failure);
    await expect(restore()).rejects.toBe(failure);
  });
});
