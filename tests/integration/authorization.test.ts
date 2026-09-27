// @vitest-environment node

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as customerDashboard } from "@/app/api/account/dashboard/route";
import { GET as adminDashboard } from "@/app/api/admin/dashboard/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as deliveryDashboard } from "@/app/api/delivery/dashboard/route";
import { GET as ownerDashboard } from "@/app/api/owner/dashboard/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const password = "ChangeMe123!";

type DashboardHandler = (request: NextRequest) => Promise<Response>;

function dashboardRequest(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {},
  });
}

async function login(email: string): Promise<string> {
  const response = await loginRoute(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    }),
  );

  expect(response.status).toBe(200);
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("role-based API authorization", () => {
  const tokens: Record<"customer" | "owner" | "delivery" | "admin", string> = {
    customer: "",
    owner: "",
    delivery: "",
    admin: "",
  };

  beforeAll(async () => {
    tokens.customer = await login("customer@agstores.local");
    tokens.owner = await login("owner@agstores.local");
    tokens.delivery = await login("delivery@agstores.local");
    tokens.admin = await login("admin@agstores.local");
  });

  afterAll(async () => {
    const { hashSessionToken } = await import("@/lib/auth/session-token");
    const { getDb } = await import("@/db");
    await getDb().authSession.deleteMany({
      where: {
        tokenHash: {
          in: Object.values(tokens).filter(Boolean).map(hashSessionToken),
        },
      },
    });
  });

  it("returns 401 for anonymous dashboard API requests", async () => {
    const routes: Array<[string, DashboardHandler]> = [
      ["/api/account/dashboard", customerDashboard],
      ["/api/owner/dashboard", ownerDashboard],
      ["/api/delivery/dashboard", deliveryDashboard],
      ["/api/admin/dashboard", adminDashboard],
    ];

    for (const [path, handler] of routes) {
      const response = await handler(dashboardRequest(path));
      expect(response.status).toBe(401);
    }
  });

  it("prevents customers from accessing owner and admin APIs", async () => {
    expect(
      (
        await ownerDashboard(
          dashboardRequest("/api/owner/dashboard", tokens.customer),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await adminDashboard(
          dashboardRequest("/api/admin/dashboard", tokens.customer),
        )
      ).status,
    ).toBe(403);
  });

  it("prevents delivery people from accessing owner APIs", async () => {
    expect(
      (
        await ownerDashboard(
          dashboardRequest("/api/owner/dashboard", tokens.delivery),
        )
      ).status,
    ).toBe(403);
  });

  it("prevents owners from accessing admin APIs", async () => {
    expect(
      (
        await adminDashboard(
          dashboardRequest("/api/admin/dashboard", tokens.owner),
        )
      ).status,
    ).toBe(403);
  });

  it("allows every role to access its own dashboard API", async () => {
    const checks: Array<[string, DashboardHandler, string]> = [
      ["/api/account/dashboard", customerDashboard, tokens.customer],
      ["/api/owner/dashboard", ownerDashboard, tokens.owner],
      ["/api/delivery/dashboard", deliveryDashboard, tokens.delivery],
      ["/api/admin/dashboard", adminDashboard, tokens.admin],
    ];

    for (const [path, handler, token] of checks) {
      const response = await handler(dashboardRequest(path, token));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.user).not.toHaveProperty("passwordHash");
    }
  });
});
