// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

import { POST } from "@/app/api/checkout/validate/route";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  validate: vi.fn(),
}));
vi.mock("@/lib/auth/request", () => ({
  authenticateRequest: mocks.authenticate,
}));
vi.mock("@/services/cart.service", () => ({
  validateCartForCheckout: mocks.validate,
}));

const body = {
  items: [
    {
      productId: "7f1d8a37-6a1b-4c8f-9f7e-1b2c3d4e5f60",
      quantity: 1,
      sellingUnit: "UNIT",
    },
  ],
};

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/checkout/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validate.mockResolvedValue({ items: [], subtotal: "0.00" });
});

it("prices a guest's cart without a session", async () => {
  mocks.authenticate.mockResolvedValue(null);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.validate).toHaveBeenCalledWith(body);
});

it("still prices a signed-in customer's cart", async () => {
  mocks.authenticate.mockResolvedValue({ user: { role: "CUSTOMER" } });
  expect((await POST(request())).status).toBe(200);
});

it("rejects staff roles and cross-site requests", async () => {
  mocks.authenticate.mockResolvedValue({ user: { role: "SHOP_OWNER" } });
  expect((await POST(request())).status).toBe(403);

  mocks.authenticate.mockResolvedValue(null);
  const crossSite = await POST(request({ Origin: "https://evil.example" }));
  expect(crossSite.status).toBe(403);
  expect(mocks.validate).not.toHaveBeenCalled();
});
