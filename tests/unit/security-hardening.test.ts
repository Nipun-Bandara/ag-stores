// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as ownerDashboard } from "@/app/api/owner/dashboard/route";
import {
  consumeAuthAttempt,
  resetAuthRateLimitsForTesting,
} from "@/lib/security/auth-rate-limit";
import { isSameOriginMutation } from "@/lib/security/request-origin";
import { cartItemInputSchema } from "@/validations/cart";
import { orderStatusTransitionSchema } from "@/validations/order";
import { productStockSchema } from "@/validations/product";
import nextConfig from "../../next.config";

describe("request security", () => {
  afterEach(() => {
    delete process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
    delete process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP;
    resetAuthRateLimitsForTesting();
  });

  it("rejects cross-site mutations and permits reads and same-origin writes", () => {
    expect(
      isSameOriginMutation(
        new Request("http://localhost/api/account/profile", {
          method: "PATCH",
          headers: { Origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginMutation(
        new Request("http://localhost/api/account/profile", {
          method: "PATCH",
          headers: { Origin: "http://localhost" },
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginMutation(
        new Request("http://localhost/api/account/profile", {
          method: "GET",
          headers: { Origin: "https://evil.example" },
        }),
      ),
    ).toBe(true);
  });

  it("enforces identifier and IP authentication attempt limits", () => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "2";
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = "20";
    const request = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.0.2.10" },
    });

    expect(
      consumeAuthAttempt(request, "login", "user@example.test").allowed,
    ).toBe(true);
    expect(
      consumeAuthAttempt(request, "login", "user@example.test").allowed,
    ).toBe(true);
    expect(
      consumeAuthAttempt(request, "login", "user@example.test"),
    ).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("returns 403 for a cross-origin authentication request", async () => {
    const response = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({
          identifier: "customer@example.test",
          password: "SecurePassword123!",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST_ORIGIN" },
    });
  });

  it("rejects anonymous API access without exposing implementation details", async () => {
    const response = await ownerDashboard(
      new NextRequest("http://localhost/api/owner/dashboard"),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    });
    expect(JSON.stringify(payload)).not.toMatch(/passwordHash|DATABASE_URL/i);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("configures browser hardening headers", async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(
      rules
        ?.flatMap((rule) => rule.headers)
        .map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});

describe("tamper-resistant request validation", () => {
  it("drops client prices so checkout must use the database value", () => {
    expect(
      cartItemInputSchema.parse({
        productId: "00000000-0000-4000-8000-000000000001",
        quantity: 2,
        price: "0.01",
      }),
    ).toEqual({
      productId: "00000000-0000-4000-8000-000000000001",
      quantity: 2,
    });
  });

  it("rejects unexpected status and stock manipulation fields", () => {
    expect(
      orderStatusTransitionSchema.safeParse({
        status: "DELIVERED",
        stockQuantity: 999,
      }).success,
    ).toBe(false);
    expect(
      productStockSchema.safeParse({
        stockQuantity: 999,
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });
});
