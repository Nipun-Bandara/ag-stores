import { expect, test } from "@playwright/test";

test("catalog routes ask guests to sign in and preserve the destination", async ({
  page,
}) => {
  for (const path of [
    "/products",
    "/products/example",
    "/categories/example",
    "/si/products",
    "/si/categories/example",
  ]) {
    await page.goto(path);
    const destination = new URL(page.url());
    expect(destination.pathname).toBe(
      path.startsWith("/si/") ? "/si/auth" : "/auth",
    );
    expect(destination.searchParams.get("returnTo")).toBe(path);
  }
});
