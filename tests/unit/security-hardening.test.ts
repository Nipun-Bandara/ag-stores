// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as ownerDashboard } from "@/app/api/owner/dashboard/route";
import {
  clearAuthAttempts,
  clientAddress,
  consumeAuthAttempt,
  resetAuthRateLimitsForTesting,
  setRateLimitStoreForTesting,
} from "@/lib/security/auth-rate-limit";
import { buildContentSecurityPolicy } from "@/lib/security/content-security-policy";
import { isSameOriginMutation } from "@/lib/security/request-origin";
import { proxy } from "@/proxy";
import { cartItemInputSchema } from "@/validations/cart";
import { orderStatusTransitionSchema } from "@/validations/order";
import { productStockSchema } from "@/validations/product";
import nextConfig from "../../next.config";

describe("request security", () => {
  afterEach(() => {
    delete process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
    delete process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP;
    delete process.env.TRUSTED_PROXY_COUNT;
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

  it("enforces identifier and IP authentication attempt limits", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "2";
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = "20";
    const request = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.0.2.10" },
    });

    expect(
      (await consumeAuthAttempt(request, "login", "user@example.test")).allowed,
    ).toBe(true);
    expect(
      (await consumeAuthAttempt(request, "login", "user@example.test")).allowed,
    ).toBe(true);
    await expect(
      consumeAuthAttempt(request, "login", "user@example.test"),
    ).resolves.toMatchObject({ allowed: false, remaining: 0 });
  });

  it("counts every format of one mobile number against the same limit", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "2";
    const request = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.0.2.11" },
    });

    await consumeAuthAttempt(request, "login", "0771234567");
    await consumeAuthAttempt(request, "login", "077-123 4567");
    await expect(
      consumeAuthAttempt(request, "login", "+94771234567"),
    ).resolves.toMatchObject({ allowed: false });
  });

  it("keeps the IP counter after a successful login", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = "2";
    const request = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.0.2.12" },
    });

    await consumeAuthAttempt(request, "login", "0771111111");
    await consumeAuthAttempt(request, "login", "0772222222");
    await clearAuthAttempts("login", "0772222222");
    await expect(
      consumeAuthAttempt(request, "login", "0773333333"),
    ).resolves.toMatchObject({ allowed: false });
  });

  it("uses the forwarded address added by the trusted proxy", () => {
    const spoofed = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.7" },
    });
    expect(clientAddress(spoofed)).toBe("198.51.100.7");

    process.env.TRUSTED_PROXY_COUNT = "2";
    expect(clientAddress(spoofed)).toBe("203.0.113.99");
    process.env.TRUSTED_PROXY_COUNT = "0";
    expect(clientAddress(spoofed)).toBe("unknown");
  });

  it("fails open when the counter store is unavailable", async () => {
    setRateLimitStoreForTesting({
      increment: () => Promise.reject(new Error("database down")),
      delete: () => Promise.resolve(),
      purgeExpired: () => Promise.resolve(),
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      consumeAuthAttempt(new Request("http://localhost/"), "login", "x"),
    ).resolves.toMatchObject({ allowed: true });
    error.mockRestore();
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

  it("builds a nonce-based script policy without unsafe-inline scripts", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://shop.example";
    const production = buildContentSecurityPolicy("abc123", "production");
    expect(production).toContain(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic'",
    );
    expect(production).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("upgrade-insecure-requests");
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3100";
    expect(buildContentSecurityPolicy("abc123", "production")).not.toContain(
      "upgrade-insecure-requests",
    );
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(buildContentSecurityPolicy("abc123", "development")).toContain(
      "'unsafe-eval'",
    );
  });

  it("sends a fresh nonce on every page request", () => {
    const policies = [1, 2].map(() => {
      const response = proxy(new NextRequest("http://localhost/landing"));
      return response.headers.get("Content-Security-Policy") ?? "";
    });
    const nonces = policies.map(
      (policy) => /'nonce-([^']+)'/.exec(policy)?.[1],
    );
    expect(nonces[0]).toBeTruthy();
    expect(nonces[0]).not.toBe(nonces[1]);
  });
});
