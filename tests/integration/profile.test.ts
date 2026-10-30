// @vitest-environment node

import { randomUUID } from "node:crypto";

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

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function jsonRequest(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describeWithDatabase("customer profile API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const email = `profile-${suffix}@example.test`;
  const otherEmail = `other-${suffix}@example.test`;
  const currentPassword = "CurrentPassword123!";
  const newPassword = "NewSecurePassword123!";
  let userId: string;
  let otherUserId: string;
  let token: string;

  afterAll(async () => {
    const userIds = [userId, otherUserId].filter(Boolean);
    if (userIds.length) {
      await prisma.authSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("creates two isolated customer accounts", async () => {
    const registration = await registerRoute(
      jsonRequest("/api/auth/register", {
        name: "Profile Customer",
        email,
        phone: "",
        password: currentPassword,
        preferredLanguage: "EN",
      }),
    );
    const otherRegistration = await registerRoute(
      jsonRequest("/api/auth/register", {
        name: "Other Customer",
        email: otherEmail,
        phone: "",
        password: currentPassword,
        preferredLanguage: "EN",
      }),
    );

    userId = (await registration.json()).data.id;
    otherUserId = (await otherRegistration.json()).data.id;
    token = registration.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";

    expect(registration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
  });

  it("allows the customer to view a safe profile", async () => {
    const response = await getProfileRoute(
      new NextRequest("http://localhost/api/account/profile", {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ id: userId, email });
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("updates valid profile data without changing role", async () => {
    const response = await updateProfileRoute(
      jsonRequest(
        "/api/account/profile",
        {
          name: "Updated Profile Customer",
          phone: "+94771234567",
          preferredLanguage: "SI",
        },
        token,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      id: userId,
      name: "Updated Profile Customer",
      phone: "+94771234567",
      preferredLanguage: "SI",
      role: "CUSTOMER",
    });
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid phone and email input", async () => {
    const invalidPhone = await updateProfileRoute(
      jsonRequest(
        "/api/account/profile",
        {
          name: "Updated Profile Customer",
          phone: "0771234567",
          preferredLanguage: "SI",
        },
        token,
      ),
    );
    const emailAttempt = await updateProfileRoute(
      jsonRequest(
        "/api/account/profile",
        {
          name: "Updated Profile Customer",
          phone: "+94771234567",
          preferredLanguage: "SI",
          email: "invalid-email",
        },
        token,
      ),
    );

    expect(invalidPhone.status).toBe(400);
    expect(emailAttempt.status).toBe(400);
  });

  it("rejects unauthenticated updates", async () => {
    const response = await updateProfileRoute(
      jsonRequest("/api/account/profile", {
        name: "Unauthorized",
        phone: "+94770000000",
        preferredLanguage: "EN",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("cannot update another customer's profile or role", async () => {
    const response = await updateProfileRoute(
      jsonRequest(
        "/api/account/profile",
        {
          userId: otherUserId,
          role: "ADMIN",
          name: "Compromised Customer",
          phone: "+94770000001",
          preferredLanguage: "EN",
        },
        token,
      ),
    );
    const otherCustomer = await prisma.user.findUniqueOrThrow({
      where: { id: otherUserId },
    });

    expect(response.status).toBe(400);
    expect(otherCustomer.name).toBe("Other Customer");
    expect(otherCustomer.role).toBe("CUSTOMER");
  });

  it("rejects a wrong current password", async () => {
    const response = await changePasswordRoute(
      jsonRequest(
        "/api/account/security/password",
        {
          currentPassword: "WrongPassword123!",
          newPassword,
          confirmPassword: newPassword,
        },
        token,
      ),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("changes the password with the correct current password", async () => {
    const response = await changePasswordRoute(
      jsonRequest(
        "/api/account/security/password",
        {
          currentPassword,
          newPassword,
          confirmPassword: newPassword,
        },
        token,
      ),
    );

    expect(response.status).toBe(200);
  });

  it("logs in with the new password and rejects the old password", async () => {
    const oldLogin = await loginRoute(
      jsonRequest("/api/auth/login", {
        identifier: email,
        password: currentPassword,
      }),
    );
    const newLogin = await loginRoute(
      jsonRequest("/api/auth/login", {
        identifier: email,
        password: newPassword,
      }),
    );

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });
});
