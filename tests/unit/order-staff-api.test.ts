// @vitest-environment node
import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as createProduct } from "@/app/api/owner/products/route";
import { PATCH as changeStock } from "@/app/api/owner/products/[productId]/stock/route";
import { PATCH as changeProduct } from "@/app/api/owner/products/[productId]/route";
import { PATCH as changeSettings } from "@/app/api/owner/shop-settings/route";
import { POST as createCategory } from "@/app/api/owner/categories/route";
import { POST as createStaff } from "@/app/api/order-staff/route";
vi.mock("@/services/auth.service", () => ({
  getUserForSessionToken: vi
    .fn()
    .mockResolvedValue({
      id: "staff",
      role: "ORDER_STAFF",
      status: "ACTIVE",
      assignedShopId: "shop",
    }),
}));
function request(path: string, method: string) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Cookie: "ag_stores_session=test-token",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
}
it("denies order staff all product, stock, category, settings, and staff-account mutations on the backend", async () => {
  const context = {
    params: Promise.resolve({
      productId: "00000000-0000-4000-8000-000000000001",
    }),
  };
  const responses = await Promise.all([
    createProduct(request("/api/owner/products", "POST")),
    changeStock(request("/api/owner/products/item/stock", "PATCH"), context),
    changeProduct(request("/api/owner/products/item", "PATCH"), context),
    changeSettings(request("/api/owner/shop-settings", "PATCH")),
    createCategory(request("/api/owner/categories", "POST")),
    createStaff(request("/api/order-staff", "POST")),
  ]);
  for (const response of responses) expect(response.status).toBe(403);
});
