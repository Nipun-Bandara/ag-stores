// @vitest-environment node
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("quantity tier migration preservation", () => {
  it("does not change old prices, totals or stock, or invent historical discounts", async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const schema = `tiers_${randomUUID().replaceAll("-", "")}`;
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET LOCAL search_path TO "${schema}"`);
      await connection.query(
        `CREATE TABLE products(id uuid PRIMARY KEY, price numeric(12,2), "stockQuantity" numeric(13,3)); CREATE TABLE order_items(id uuid PRIMARY KEY, "unitPrice" numeric(12,2), quantity numeric(13,3)); CREATE TABLE orders(total numeric(12,2)); INSERT INTO products VALUES('00000000-0000-4000-8000-000000000001',100.00,2.125);INSERT INTO order_items VALUES('00000000-0000-4000-8000-000000000002',80.00,2.5); INSERT INTO orders VALUES(200.00);`,
      );
      await connection.query(
        await readFile(
          new URL(
            "../../prisma/migrations/20261102100000_quantity_discount_tiers/migration.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      expect(
        (await connection.query("SELECT * FROM products")).rows[0],
      ).toMatchObject({ price: "100.00", stockQuantity: "2.125" });
      expect(
        (await connection.query("SELECT * FROM order_items")).rows[0],
      ).toMatchObject({
        unitPrice: "80.00",
        quantity: "2.500",
        regularPrice: null,
        appliedDiscount: null,
      });
      expect(
        (await connection.query("SELECT total FROM orders")).rows[0].total,
      ).toBe("200.00");
      expect(
        (await connection.query("SELECT count(*) FROM product_discount_tiers"))
          .rows[0].count,
      ).toBe("0");
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
      await pool.end();
    }
  });
});
