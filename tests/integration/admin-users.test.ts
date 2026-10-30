// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as userDetailRoute } from "@/app/api/admin/users/[userId]/route";
import { PATCH as userStatusRoute } from "@/app/api/admin/users/[userId]/status/route";
import { GET as userListRoute } from "@/app/api/admin/users/route";
import { PrismaClient, UserRole, UserStatus } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, token: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function context(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

async function login(email: string) {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password: "ChangeMe123!" }),
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("admin user management API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const managedEmail = `admin-managed-${suffix}@example.test`;
  const extraAdminEmail = `admin-backup-${suffix}@example.test`;
  const tokens: string[] = [];
  let adminToken = "";
  let customerToken = "";
  let ownerToken = "";
  let deliveryToken = "";
  let managedUserId = "";
  let extraAdminId = "";
  let seededAdminId = "";

  beforeAll(async () => {
    [adminToken, customerToken, ownerToken, deliveryToken] = await Promise.all([
      login("admin@agstores.local"),
      login("customer@agstores.local"),
      login("owner@agstores.local"),
      login("delivery@agstores.local"),
    ]);
    tokens.push(adminToken, customerToken, ownerToken, deliveryToken);

    const passwordHash = await hashPassword("ChangeMe123!");
    const [managedUser, extraAdmin, seededAdmin] = await Promise.all([
      prisma.user.create({
        data: {
          name: `Searchable Customer ${suffix}`,
          email: managedEmail,
          phone: `+9478${suffix.replace(/\D/g, "").padEnd(8, "4").slice(0, 8)}`,
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      }),
      prisma.user.create({
        data: {
          name: `Backup Administrator ${suffix}`,
          email: extraAdminEmail,
          passwordHash,
          role: UserRole.ADMIN,
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: "admin@agstores.local" },
      }),
    ]);
    managedUserId = managedUser.id;
    extraAdminId = extraAdmin.id;
    seededAdminId = seededAdmin.id;
  });

  afterAll(async () => {
    if (seededAdminId) {
      await prisma.user.update({
        where: { id: seededAdminId },
        data: { status: UserStatus.ACTIVE },
      });
    }
    await prisma.authSession.deleteMany({
      where: {
        OR: [
          { userId: { in: [managedUserId, extraAdminId].filter(Boolean) } },
          {
            tokenHash: {
              in: tokens.filter(Boolean).map(hashSessionToken),
            },
          },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [managedUserId, extraAdminId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it("allows administrators to search and filter users", async () => {
    const response = await userListRoute(
      request(
        `/api/admin/users?search=${encodeURIComponent(suffix)}&role=CUSTOMER&status=ACTIVE`,
        adminToken,
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({
      id: managedUserId,
      email: managedEmail,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    });
    expect(JSON.stringify(payload)).not.toContain("passwordHash");
  });

  it("returns password-free account details", async () => {
    const response = await userDetailRoute(
      request(`/api/admin/users/${managedUserId}`, adminToken),
      context(managedUserId),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: managedUserId,
      activity: {
        savedAddresses: 0,
        customerOrders: 0,
        deliveryBatches: 0,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("passwordHash");
  });

  it("rejects customer, owner, and delivery-person access", async () => {
    for (const token of [customerToken, ownerToken, deliveryToken]) {
      const listResponse = await userListRoute(
        request("/api/admin/users", token),
      );
      const detailResponse = await userDetailRoute(
        request(`/api/admin/users/${managedUserId}`, token),
        context(managedUserId),
      );
      const statusResponse = await userStatusRoute(
        request(`/api/admin/users/${managedUserId}/status`, token, "PATCH", {
          status: UserStatus.INACTIVE,
        }),
        context(managedUserId),
      );
      expect(listResponse.status).toBe(403);
      expect(detailResponse.status).toBe(403);
      expect(statusResponse.status).toBe(403);
    }
  });

  it("deactivates and reactivates an account while revoking sessions", async () => {
    const managedToken = await login(managedEmail);
    tokens.push(managedToken);
    expect(managedToken).not.toBe("");

    const deactivate = await userStatusRoute(
      request(`/api/admin/users/${managedUserId}/status`, adminToken, "PATCH", {
        status: UserStatus.INACTIVE,
      }),
      context(managedUserId),
    );
    expect(deactivate.status).toBe(200);
    expect((await deactivate.json()).data.status).toBe(UserStatus.INACTIVE);
    expect(
      await prisma.authSession.count({
        where: { tokenHash: hashSessionToken(managedToken) },
      }),
    ).toBe(0);

    const activate = await userStatusRoute(
      request(`/api/admin/users/${managedUserId}/status`, adminToken, "PATCH", {
        status: UserStatus.ACTIVE,
      }),
      context(managedUserId),
    );
    expect(activate.status).toBe(200);
    expect((await activate.json()).data.status).toBe(UserStatus.ACTIVE);
  });

  it("prevents deactivation of the final active administrator", async () => {
    const deactivateBackup = await userStatusRoute(
      request(`/api/admin/users/${extraAdminId}/status`, adminToken, "PATCH", {
        status: UserStatus.INACTIVE,
      }),
      context(extraAdminId),
    );
    expect(deactivateBackup.status).toBe(200);

    const response = await userStatusRoute(
      request(`/api/admin/users/${seededAdminId}/status`, adminToken, "PATCH", {
        status: UserStatus.INACTIVE,
      }),
      context(seededAdminId),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("FINAL_ACTIVE_ADMIN");
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: seededAdminId } }),
    ).toMatchObject({ status: UserStatus.ACTIVE });
  });
});
