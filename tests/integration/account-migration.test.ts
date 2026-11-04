// @vitest-environment node
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
import { describe, expect, it } from "vitest";
const run = promisify(execFile);
const databaseUrl = process.env.TEST_DATABASE_URL;
const withDatabase = databaseUrl ? describe : describe.skip;
const migrationName = "20261104100000_mobile_accounts";

withDatabase("staged mobile-account migration", () => {
  it("preserves UUID relationships, legacy names and stable development placeholders", async () => {
    const schema = `account_fixture_${randomUUID().replaceAll("-", "")}`;
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const connection = await pool.connect();
    try {
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET search_path TO "${schema}"`);
      for (const directory of (await readdir("prisma/migrations"))
        .filter((value) => value < migrationName)
        .sort()) {
        await connection.query(
          await readFile(
            `prisma/migrations/${directory}/migration.sql`,
            "utf8",
          ),
        );
      }
      const id = randomUUID();
      await connection.query(
        'INSERT INTO users (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
        [id, "Mononym", "legacy@example.test", "unchanged-hash", "CUSTOMER"],
      );
      await connection.query(
        'INSERT INTO auth_sessions (id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,NOW()+interval \'1 day\')',
        [randomUUID(), id, "a".repeat(64)],
      );
      const sql = await readFile(
        `prisma/migrations/${migrationName}/migration.sql`,
        "utf8",
      );
      await expect(connection.query(sql)).rejects.toThrow(
        "Unresolved account identity",
      );
      await connection.query("ROLLBACK");
      const url = new URL(databaseUrl!);
      url.searchParams.set("options", `-csearch_path=${schema}`);
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        DATABASE_URL: url.toString(),
        ALLOW_DEV_ACCOUNT_PLACEHOLDERS: "1",
        NODE_ENV: "test",
      };
      await run(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/account-backfill.ts",
          "--dev-placeholders",
        ],
        { env },
      );
      const before = (
        await connection.query("SELECT * FROM users WHERE id=$1", [id])
      ).rows[0];
      await run(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/account-backfill.ts",
          "--dev-placeholders",
        ],
        { env },
      );
      expect(
        (await connection.query("SELECT * FROM users WHERE id=$1", [id]))
          .rows[0],
      ).toEqual(before);
      await connection.query(sql);
      const user = (
        await connection.query("SELECT * FROM users WHERE id=$1", [id])
      ).rows[0];
      expect(user).toMatchObject({
        id,
        legacyName: "Mononym",
        firstName: "Mononym",
        lastName: "Placeholder",
        name: "Mononym Placeholder",
        passwordHash: "unchanged-hash",
      });
      expect(user.phone).toMatch(/^\+947\d{8}$/);
      await connection.query(
        'UPDATE users SET "firstName"=$1,"lastName"=$2 WHERE id=$3',
        ["Mary Ann", "De Silva", id],
      );
      await run(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/account-backfill.ts",
          "--dev-placeholders",
        ],
        { env },
      );
      expect(
        (
          await connection.query(
            'SELECT "firstName","lastName","legacyName",phone FROM users WHERE id=$1',
            [id],
          )
        ).rows[0],
      ).toEqual({
        firstName: "Mary Ann",
        lastName: "De Silva",
        legacyName: "Mononym",
        phone: user.phone,
      });
      expect(
        (
          await connection.query(
            'SELECT count(*)::int AS count FROM auth_sessions WHERE "userId"=$1',
            [id],
          )
        ).rows[0].count,
      ).toBe(1);
    } finally {
      await connection.query("ROLLBACK");
      await connection.query("SET search_path TO public");
      await connection.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      connection.release();
      await pool.end();
    }
  }, 30000);
  it("detects equivalent-number collisions before making backfill changes", async () => {
    const schema = `account_collision_${randomUUID().replaceAll("-", "")}`;
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const connection = await pool.connect();
    try {
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET search_path TO "${schema}"`);
      for (const directory of (await readdir("prisma/migrations"))
        .filter((value) => value < migrationName)
        .sort())
        await connection.query(
          await readFile(
            `prisma/migrations/${directory}/migration.sql`,
            "utf8",
          ),
        );
      await connection.query(
        "ALTER TABLE users DROP CONSTRAINT users_phone_format_check",
      );
      for (const phone of ["0771234567", "+94771234567"])
        await connection.query(
          'INSERT INTO users (id,name,phone,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
          [randomUUID(), "Same Name", phone, "hash", "CUSTOMER"],
        );
      const url = new URL(databaseUrl!);
      url.searchParams.set("options", `-csearch_path=${schema}`);
      await expect(
        run(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/account-backfill.ts",
            "--dev-placeholders",
          ],
          {
            env: {
              ...process.env,
              DATABASE_URL: url.toString(),
              ALLOW_DEV_ACCOUNT_PLACEHOLDERS: "1",
              NODE_ENV: "test",
            },
          },
        ),
      ).rejects.toThrow();
      expect(
        (
          await connection.query("SELECT phone FROM users ORDER BY phone")
        ).rows.map((row) => row.phone),
      ).toEqual(["+94771234567", "0771234567"]);
      await expect(
        connection.query(
          await readFile(
            `prisma/migrations/${migrationName}/migration.sql`,
            "utf8",
          ),
        ),
      ).rejects.toThrow("Mobile normalization collision");
    } finally {
      await connection.query("ROLLBACK");
      await connection.query("SET search_path TO public");
      await connection.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      connection.release();
      await pool.end();
    }
  }, 30000);
});
