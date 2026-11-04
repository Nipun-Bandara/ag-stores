// @vitest-environment node
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("stage 1 migration preservation", () => {
  it("keeps existing identifiers, category links, prices, stock and historical money unchanged", async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      // A transaction-local schema allows testing old data without resetting any database.
      const schema = `stage1_${randomUUID().replaceAll("-", "")}`;
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET LOCAL search_path TO "${schema}"`);
      await connection.query(`
        CREATE TABLE categories (id uuid PRIMARY KEY);
        CREATE TABLE products (id uuid PRIMARY KEY, "shopId" uuid, "categoryId" uuid REFERENCES categories(id), price numeric(12,2), "stockQuantity" integer DEFAULT 0, "lowStockThreshold" integer DEFAULT 5);
        CREATE TABLE orders (id uuid PRIMARY KEY, subtotal numeric(12,2), total numeric(12,2));
        CREATE TABLE order_items (id uuid PRIMARY KEY, quantity integer CONSTRAINT order_items_quantity_check CHECK (quantity > 0), "unitPrice" numeric(12,2));
        INSERT INTO categories VALUES ('00000000-0000-4000-8000-000000000001');
        INSERT INTO products VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001',125.50,12,5);
        INSERT INTO orders VALUES ('00000000-0000-4000-8000-000000000004',251.00,501.00);
        INSERT INTO order_items VALUES ('00000000-0000-4000-8000-000000000005',2,125.50);
      `);
      const migration = await readFile(
        new URL(
          "../../prisma/migrations/20261101100000_product_selling_setup/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await connection.query(migration);
      expect(
        (await connection.query("SELECT * FROM products")).rows[0],
      ).toMatchObject({
        id: "00000000-0000-4000-8000-000000000002",
        categoryId: "00000000-0000-4000-8000-000000000001",
        itemCode: null,
        barcode: null,
        sellingUnit: "UNIT",
        minimumOrderQuantity: "1.000",
        orderingIncrement: "1.000",
        price: "125.50",
        stockQuantity: "12.000",
        lowStockThreshold: "5.000",
      });
      expect(
        (await connection.query("SELECT * FROM order_items")).rows[0],
      ).toMatchObject({
        quantity: "2.000",
        unitPrice: "125.50",
        sellingUnit: "UNIT",
      });
      expect(
        (await connection.query("SELECT * FROM orders")).rows[0],
      ).toMatchObject({ subtotal: "251.00", total: "501.00" });
      expect(
        (await connection.query("SELECT count(*) FROM categories")).rows[0]
          .count,
      ).toBe("1");
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
      await pool.end();
    }
  });
});
