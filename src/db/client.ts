import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { databaseConnectionConfig } from "@/db/connection";
import { getServerEnv } from "@/validations/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getDb(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const environment = getServerEnv();
  const adapter = new PrismaPg(
    databaseConnectionConfig(
      environment.DATABASE_URL,
      environment.DATABASE_PREFER_IPV4 === "true",
    ),
  );
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;

  return client;
}
