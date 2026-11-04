import pg from "pg";

/** Existing fixtures may be located by email for setup; the browser logs in by mobile. */
export async function mobileForTestAccount(
  identifier: string,
): Promise<string> {
  if (!identifier.includes("@")) return identifier;
  const pool = new pg.Pool({
    connectionString:
      process.env.TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test",
  });
  try {
    const result = await pool.query<{ phone: string }>(
      "SELECT phone FROM users WHERE lower(email)=lower($1)",
      [identifier],
    );
    if (!result.rows[0]) throw new Error(`Missing test account ${identifier}`);
    return result.rows[0].phone;
  } finally {
    await pool.end();
  }
}

export async function fillAccountNames(
  page: import("@playwright/test").Page,
  name: string,
) {
  const parts = name.trim().split(/\s+/);
  await page
    .getByLabel("First name", { exact: true })
    .fill(parts.slice(0, -1).join(" "));
  await page.getByLabel("Last name", { exact: true }).fill(parts.at(-1)!);
}

export function randomTestMobile() {
  return `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
}
