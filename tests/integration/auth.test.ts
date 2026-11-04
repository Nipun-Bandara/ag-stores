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
function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describeWithDatabase("mobile authentication API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const email = `auth-${suffix}@example.test`;
  const phone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const localPhone = `0${phone.slice(3)}`;
  const password = "SecurePassword123!";
  let userId = "",
    registrationToken = "",
    loginToken = "";
  const extraIds: string[] = [];
  afterAll(async () => {
    const ids = [userId, ...extraIds].filter(Boolean);
    if (ids.length) {
      await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("requires mobile and both names and disallows public role selection", async () => {
    for (const payload of [
      { firstName: "A", lastName: "B", password, preferredLanguage: "EN" },
      { lastName: "B", phone, password, preferredLanguage: "EN" },
      { firstName: "A", phone, password, preferredLanguage: "EN" },
      {
        firstName: "A",
        lastName: "B",
        phone,
        password,
        preferredLanguage: "EN",
        role: "ADMIN",
      },
    ])
      expect(
        (await registerRoute(request("/api/auth/register", payload))).status,
      ).toBe(400);
  });
  it("registers without email, normalizes phone and creates a secure customer session", async () => {
    const response = await registerRoute(
      request("/api/auth/register", {
        firstName: "අමා",
        lastName: "Perera",
        phone: localPhone,
        password,
        preferredLanguage: "SI",
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      phone,
      email: null,
      role: UserRole.CUSTOMER,
    });
    expect(body.data).not.toHaveProperty("passwordHash");
    registrationToken = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    userId = body.data.id;
    expect(registrationToken).toHaveLength(43);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
  it("allows duplicate names but rejects equivalent mobile formats", async () => {
    const duplicate = await registerRoute(
      request("/api/auth/register", {
        firstName: "අමා",
        lastName: "Perera",
        phone,
        email,
        password,
        preferredLanguage: "EN",
      }),
    );
    expect(duplicate.status).toBe(409);
  });
  it("handles concurrent equivalent-mobile registrations without duplicate accounts", async () => {
    const number = `+9476${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
    const payload = {
      firstName: "අමා",
      lastName: "Perera",
      email: "",
      password,
      preferredLanguage: "EN",
    };
    const results = await Promise.all(
      [number, `0${number.slice(3)}`].map((mobile) =>
        registerRoute(
          request("/api/auth/register", { ...payload, phone: mobile }),
        ),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    for (const result of results)
      if (result.status === 201) extraIds.push((await result.json()).data.id);
    expect(await prisma.user.count({ where: { phone: number } })).toBe(1);
  });
  it("logs in by mobile only and uses a generic failure for unknown numbers", async () => {
    const response = await loginRoute(
      request("/api/auth/login", { identifier: localPhone, password }),
    );
    expect(response.status).toBe(200);
    loginToken = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    expect(loginToken).not.toBe(registrationToken);
    const wrong = await loginRoute(
      request("/api/auth/login", {
        identifier: phone,
        password: "WrongPassword123!",
      }),
    );
    const unknown = await loginRoute(
      request("/api/auth/login", { identifier: "+94789999999", password }),
    );
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await wrong.json()).error.message).toBe(
      (await unknown.json()).error.message,
    );
    expect(
      (
        await loginRoute(
          request("/api/auth/login", { identifier: email, password }),
        )
      ).status,
    ).toBe(400);
  });
  it("preserves session identity and revokes only the logged-out session", async () => {
    const headers = { Cookie: `${SESSION_COOKIE_NAME}=${loginToken}` };
    const session = await sessionRoute(
      new NextRequest("http://localhost/api/auth/session", { headers }),
    );
    expect((await session.json()).data).toMatchObject({ id: userId, phone });
    const logout = await logoutRoute(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers,
      }),
    );
    expect(logout.status).toBe(200);
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
