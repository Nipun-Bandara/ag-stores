// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import {
  GET as getProfileRoute,
  PATCH as updateProfileRoute,
} from "@/app/api/account/profile/route";
import { POST as changePasswordRoute } from "@/app/api/account/security/password/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
function request(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describeWithDatabase("shared self-profile API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const currentPassword = "CurrentPassword123!",
    newPassword = "NewSecurePassword123!";
  const phone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const otherPhone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const changedPhone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const profileEmail = `profile-${phone.slice(3)}@example.test`;
  let addressId = "";
  let userId = "",
    otherId = "",
    token = "";
  afterAll(async () => {
    const ids = [userId, otherId].filter(Boolean);
    if (ids.length) {
      await prisma.customerAddress.deleteMany({
        where: { customerId: { in: ids } },
      });
      await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });
  const details = (mobile: string, email = "") => ({
    firstName: "Same",
    lastName: "Name",
    phone: mobile,
    email,
    preferredLanguage: "EN",
  });
  it("creates two accounts with the same names and optional email", async () => {
    const a = await registerRoute(
      request("/api/auth/register", {
        ...details(phone, profileEmail),
        password: currentPassword,
      }),
    );
    const b = await registerRoute(
      request("/api/auth/register", {
        ...details(otherPhone),
        password: currentPassword,
      }),
    );
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userId = (await a.json()).data.id;
    otherId = (await b.json()).data.id;
    token = a.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId: userId,
          label: "Profile home",
          address: "1 Test Road",
          latitude: "6.9",
          longitude: "79.8",
        },
      })
    ).id;
  });
  it("returns only the signed-in user's safe profile", async () => {
    const response = await getProfileRoute(
      new NextRequest("http://localhost/api/account/profile", {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );
    const data = (await response.json()).data;
    expect(data).toMatchObject({
      id: userId,
      firstName: "Same",
      lastName: "Name",
      phone,
      email: profileEmail,
    });
    expect(data).not.toHaveProperty("passwordHash");
  });
  it("edits names and language and clears optional email without changing UUID", async () => {
    const response = await updateProfileRoute(
      request(
        "/api/account/profile",
        { ...details(phone, ""), firstName: "தமிழ்", preferredLanguage: "SI" },
        token,
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      id: userId,
      name: "தமிழ் Name",
      email: null,
      role: "CUSTOMER",
    });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .legacyName,
    ).toBeNull();
  });
  it("rejects protected fields and another account's mobile", async () => {
    const protectedEdit = await updateProfileRoute(
      request(
        "/api/account/profile",
        { ...details(phone), role: "ADMIN", userId: otherId },
        token,
      ),
    );
    expect(protectedEdit.status).toBe(400);
    const duplicate = await updateProfileRoute(
      request(
        "/api/account/profile",
        { ...details(otherPhone), currentPassword },
        token,
      ),
    );
    expect(duplicate.status).toBe(409);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).phone,
    ).toBe(phone);
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ).toMatchObject({ firstName: "தமிழ்", email: null });
  });
  it("requires the current password for a changed mobile and rolls back wrong passwords", async () => {
    const missing = await updateProfileRoute(
      request("/api/account/profile", { ...details(changedPhone) }, token),
    );
    expect((await missing.json()).error.code).toBe("CURRENT_PASSWORD_REQUIRED");
    const wrong = await updateProfileRoute(
      request(
        "/api/account/profile",
        { ...details(changedPhone), currentPassword: "WrongPassword123!" },
        token,
      ),
    );
    expect((await wrong.json()).error.code).toBe("INVALID_CURRENT_PASSWORD");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).phone,
    ).toBe(phone);
  });
  it("normalizes a changed mobile and keeps the same UUID and session", async () => {
    const local = `0${changedPhone.slice(3)}`;
    const response = await updateProfileRoute(
      request(
        "/api/account/profile",
        { ...details(local), currentPassword },
        token,
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      id: userId,
      phone: changedPhone,
    });
    const profile = await getProfileRoute(
      new NextRequest("http://localhost/api/account/profile", {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );
    expect((await profile.json()).data.id).toBe(userId);
    expect(
      (
        await prisma.customerAddress.findUniqueOrThrow({
          where: { id: addressId },
        })
      ).customerId,
    ).toBe(userId);
    expect(
      (
        await loginRoute(
          request("/api/auth/login", {
            identifier: phone,
            password: currentPassword,
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await loginRoute(
          request("/api/auth/login", {
            identifier: changedPhone,
            password: currentPassword,
          }),
        )
      ).status,
    ).toBe(200);
  });
  it("reuses the password-change flow", async () => {
    const wrong = await changePasswordRoute(
      request(
        "/api/account/security/password",
        {
          currentPassword: "WrongPassword123!",
          newPassword,
          confirmPassword: newPassword,
        },
        token,
      ),
    );
    expect(wrong.status).toBe(400);
    const changed = await changePasswordRoute(
      request(
        "/api/account/security/password",
        { currentPassword, newPassword, confirmPassword: newPassword },
        token,
      ),
    );
    expect(changed.status).toBe(200);
    expect(
      (
        await loginRoute(
          request("/api/auth/login", {
            identifier: changedPhone,
            password: newPassword,
          }),
        )
      ).status,
    ).toBe(200);
  });
  it.each([
    "admin@agstores.local",
    "owner@agstores.local",
    "delivery@agstores.local",
    "customer@agstores.local",
  ])(
    "supports self-profile management for %s without changing assignments",
    async (email) => {
      const before = await prisma.user.findUniqueOrThrow({ where: { email } });
      const login = await loginRoute(
        request("/api/auth/login", {
          identifier: before.phone,
          password: "ChangeMe123!",
        }),
      );
      expect(login.status).toBe(200);
      const sessionToken = login.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
      try {
        const response = await updateProfileRoute(
          request(
            "/api/account/profile",
            {
              firstName: before.firstName,
              lastName: before.lastName,
              phone: before.phone,
              email: before.email ?? "",
              preferredLanguage: before.preferredLanguage,
            },
            sessionToken,
          ),
        );
        expect(response.status).toBe(200);
        const after = await prisma.user.findUniqueOrThrow({
          where: { id: before.id },
        });
        expect(after).toMatchObject({
          id: before.id,
          role: before.role,
          status: before.status,
          assignedShopId: before.assignedShopId,
        });
      } finally {
        await prisma.authSession.deleteMany({
          where: { tokenHash: hashSessionToken(sessionToken) },
        });
      }
    },
  );
});
