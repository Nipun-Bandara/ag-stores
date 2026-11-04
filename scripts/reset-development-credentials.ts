import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

if (
  process.env.ALLOW_DEV_CREDENTIAL_RESET !== "1" ||
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "Explicit development credential reset requires ALLOW_DEV_CREDENTIAL_RESET=1 outside production.",
  );
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const passwordHash = await hashPassword("ChangeMe123!");
  for (const developmentFixtureKey of [
    "admin",
    "owner",
    "delivery",
    "customer",
  ]) {
    const result = await prisma.user.updateMany({
      where: { developmentFixtureKey },
      data: { passwordHash },
    });
    console.log(`${developmentFixtureKey}: ${result.count} credential reset`);
  }
} finally {
  await prisma.$disconnect();
}
