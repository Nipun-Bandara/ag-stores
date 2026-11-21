import { expect, test } from "@playwright/test";

test("guests can browse catalog routes without signing in", async ({
  page,
}) => {
  for (const path of ["/products", "/cart", "/si/products"]) {
    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(path);
  }
});

test("ordering routes ask guests to sign in and preserve the destination", async ({
  page,
}) => {
  for (const path of ["/checkout", "/si/account/orders"]) {
    await page.goto(path);
    const destination = new URL(page.url());
    expect(destination.pathname).toBe(
      path.startsWith("/si/") ? "/si/auth" : "/auth",
    );
    expect(destination.searchParams.get("returnTo")).toBe(path);
  }
});
