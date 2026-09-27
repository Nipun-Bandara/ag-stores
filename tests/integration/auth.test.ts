// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { GET as sessionRoute } from "@/app/api/auth/session/route";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describeWithDatabase("authentication API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const email = `auth-${suffix}@example.test`;
  const password = "SecurePassword123!";
  let userId: string;
  let registrationToken: string;
  let loginToken: string;

  afterAll(async () => {
    if (userId) {
      await prisma.authSession.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("rejects invalid registration input", async () => {
    const response = await registerRoute(
      jsonRequest("/api/auth/register", {
        name: "A",
        email: "not-an-email",
        password: "weak",
        preferredLanguage: "EN",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("registers only a customer and creates a secure session", async () => {
    const response = await registerRoute(
      jsonRequest("/api/auth/register", {
        name: "Authentication Test Customer",
        email,
        phone: "",
        password,
        preferredLanguage: "SI",
        role: "ADMIN",
      }),
    );
    const body = await response.json();
    registrationToken = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    userId = body.data.id;

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ email, role: UserRole.CUSTOMER });
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(registrationToken).toHaveLength(43);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(await prisma.authSession.count({ where: { userId } })).toBe(1);
  });

  it("logs in with valid credentials and creates another session", async () => {
    const response = await loginRoute(
      jsonRequest("/api/auth/login", { identifier: email, password }),
    );
    const body = await response.json();
    loginToken = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";

    expect(response.status).toBe(200);
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(loginToken).not.toBe(registrationToken);
    expect(await prisma.authSession.count({ where: { userId } })).toBe(2);
  });

  it("uses the same generic error for wrong passwords and unknown users", async () => {
    const wrongPassword = await loginRoute(
      jsonRequest("/api/auth/login", {
        identifier: email,
        password: "IncorrectPassword123!",
      }),
    );
    const unknownUser = await loginRoute(
      jsonRequest("/api/auth/login", {
        identifier: `unknown-${suffix}@example.test`,
        password,
      }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect((await wrongPassword.json()).error.message).toBe(
      (await unknownUser.json()).error.message,
    );
  });

  it("retrieves the authenticated user from the session", async () => {
    const response = await sessionRoute(
      new NextRequest("http://localhost/api/auth/session", {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${loginToken}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ id: userId, email });
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("logs out, revokes the session, and clears the cookie", async () => {
    const cookieHeader = { Cookie: `${SESSION_COOKIE_NAME}=${loginToken}` };
    const response = await logoutRoute(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: cookieHeader,
      }),
    );
    const sessionAfterLogout = await sessionRoute(
      new NextRequest("http://localhost/api/auth/session", {
        headers: cookieHeader,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
    expect(sessionAfterLogout.status).toBe(401);
    expect(
      await prisma.authSession.count({
        where: { tokenHash: hashSessionToken(loginToken) },
      }),
    ).toBe(0);
    expect(
      await prisma.authSession.count({
        where: { tokenHash: hashSessionToken(registrationToken) },
      }),
    ).toBe(1);
  });
});
