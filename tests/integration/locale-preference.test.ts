// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";

import { POST as registerRoute } from "@/app/api/auth/register/route";
import { PATCH as localeRoute } from "@/app/api/locale/route";
import { PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/config";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("customer locale preference", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const email = `locale-${randomUUID()}@example.test`;
  let userId = "";

  afterAll(async () => {
    if (userId) {
      await prisma.authSession.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("remembers a signed-in customer's selected language", async () => {
    const registration = await registerRoute(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Localized Customer",
          email,
          phone: "",
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        }),
      }),
    );
    const registrationBody = await registration.json();
    userId = registrationBody.data.id;
    const token = registration.cookies.get(SESSION_COOKIE_NAME)?.value;

    const response = await localeRoute(
      new NextRequest("http://localhost/api/locale", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify({ locale: "si" }),
      }),
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(response.status).toBe(200);
    expect(response.cookies.get(LOCALE_COOKIE_NAME)?.value).toBe("si");
    expect(user.preferredLanguage).toBe("SI");
  });

  it("rejects unsupported locales", async () => {
    const response = await localeRoute(
      new NextRequest("http://localhost/api/locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "fr" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
