import "dotenv/config";
import { createHash } from "node:crypto";
import pg from "pg";
import { normalizeMobile, personNameSchema } from "../src/lib/account-identity";

const apply = process.argv.includes("--dev-placeholders");
if (
  apply &&
  (process.env.ALLOW_DEV_ACCOUNT_PLACEHOLDERS !== "1" ||
    process.env.NODE_ENV === "production")
) {
  throw new Error(
    "Development placeholders require ALLOW_DEV_ACCOUNT_PLACEHOLDERS=1 outside production.",
  );
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const connection = await pool.connect();
try {
  await connection.query("BEGIN");
  const result = await connection.query<{
    id: string;
    name: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  }>(
    `SELECT "id", "name", "phone", to_jsonb(u)->>'firstName' AS "firstName", to_jsonb(u)->>'lastName' AS "lastName" FROM "users" u ORDER BY "id" FOR UPDATE`,
  );
  const used = new Map<string, string>();
  const planned = result.rows.map((row) => ({
    ...row,
    canonical: row.phone ? normalizeMobile(row.phone) : null,
  }));
  for (const row of planned) {
    if (row.phone && !row.canonical)
      throw new Error(
        `Invalid mobile for user ${row.id}; correct it manually.`,
      );
    if (row.canonical && used.has(row.canonical))
      throw new Error(
        `Normalized mobile collision: users ${used.get(row.canonical)} and ${row.id}.`,
      );
    if (row.canonical) used.set(row.canonical, row.id);
  }
  const splitName = (name: string) => {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    return {
      firstName:
        parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? ""),
      lastName: parts.length > 1 ? parts.at(-1)! : "",
    };
  };
  const resolvedName = (row: (typeof planned)[number]) => {
    const split = splitName(row.name);
    return {
      firstName: personNameSchema.safeParse(row.firstName).success
        ? row.firstName!.trim()
        : split.firstName,
      lastName: personNameSchema.safeParse(row.lastName).success
        ? row.lastName!.trim()
        : split.lastName,
    };
  };
  const usableName = (row: (typeof planned)[number]) => {
    const split = resolvedName(row);
    return (
      personNameSchema.safeParse(split.firstName).success &&
      personNameSchema.safeParse(split.lastName).success
    );
  };
  const unresolved = planned.filter(
    (row) => !row.canonical || !usableName(row),
  );
  console.log(
    JSON.stringify(
      {
        total: planned.length,
        inferredNameSplitIds: planned
          .filter((row) => usableName(row) && (!row.firstName || !row.lastName))
          .map(({ id }) => id),
        unresolved: unresolved.map((row) => ({
          id: row.id,
          missingPhone: !row.phone,
          unusableName: !usableName(row),
        })),
      },
      null,
      2,
    ),
  );
  if (!apply) {
    await connection.query("ROLLBACK");
    if (unresolved.length) process.exitCode = 1;
  } else {
    await connection.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(75)',
    );
    await connection.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(75)',
    );
    await connection.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legacyName" VARCHAR(151)',
    );
    for (const row of planned) {
      let phone = row.canonical;
      if (!phone) {
        for (let attempt = 0; attempt < 100; attempt++) {
          const digits =
            createHash("sha256")
              .update(`${row.id}:${attempt}`)
              .digest()
              .readUInt32BE(0) % 10_000_000;
          const candidate = `+9479${String(digits).padStart(7, "0")}`;
          if (!used.has(candidate)) {
            phone = candidate;
            used.set(candidate, row.id);
            break;
          }
        }
        if (!phone)
          throw new Error(`No available placeholder for user ${row.id}`);
      }
      const split = resolvedName(row);
      const firstName = personNameSchema.safeParse(split.firstName).success
        ? split.firstName
        : "Development";
      const lastName = personNameSchema.safeParse(split.lastName).success
        ? split.lastName
        : "Placeholder";
      await connection.query(
        'UPDATE "users" SET "legacyName"=COALESCE("legacyName","name"), "firstName"=$1, "lastName"=$2, "phone"=$3 WHERE "id"=$4',
        [firstName, lastName, phone, row.id],
      );
      if (!row.canonical || !usableName(row))
        console.log(
          `Development placeholder assigned to user ${row.id}: ${phone}; original name preserved.`,
        );
    }
    await connection.query("COMMIT");
  }
} catch (error) {
  await connection.query("ROLLBACK");
  throw error;
} finally {
  connection.release();
  await pool.end();
}
