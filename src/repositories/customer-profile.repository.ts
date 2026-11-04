import {
  PreferredLanguage,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import type { AuthenticatedUser } from "@/types/auth";

const profileSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  preferredLanguage: true,
  status: true,
} satisfies Prisma.UserSelect;

export interface ProfileUpdateRecord {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  preferredLanguage: "EN" | "SI";
  currentPassword?: string | undefined;
}
export interface PasswordRecord {
  passwordHash: string;
}
export class CurrentPasswordRequiredError extends Error {}
export class IncorrectCurrentPasswordError extends Error {}

export interface CustomerProfileRepository {
  findCustomerById(userId: string): Promise<AuthenticatedUser | null>;
  updateCustomer(
    userId: string,
    input: ProfileUpdateRecord,
  ): Promise<AuthenticatedUser>;
  updatePreferredLanguage(
    userId: string,
    preferredLanguage: "EN" | "SI",
  ): Promise<void>;
  findPasswordRecord(userId: string): Promise<PasswordRecord | null>;
  updatePasswordAndRevokeOtherSessions(
    userId: string,
    passwordHash: string,
    currentTokenHash: string,
  ): Promise<void>;
}

export class PrismaCustomerProfileRepository implements CustomerProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCustomerById(userId: string): Promise<AuthenticatedUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
  }

  updateCustomer(
    userId: string,
    input: ProfileUpdateRecord,
  ): Promise<AuthenticatedUser> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const current = await transaction.user.findUniqueOrThrow({
        where: { id: userId },
        select: { phone: true, passwordHash: true },
      });
      if (current.phone !== input.phone) {
        if (!input.currentPassword) throw new CurrentPasswordRequiredError();
        if (
          !(await verifyPassword(input.currentPassword, current.passwordHash))
        ) {
          throw new IncorrectCurrentPasswordError();
        }
      }
      return transaction.user.update({
        where: { id: userId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          preferredLanguage:
            input.preferredLanguage === "SI"
              ? PreferredLanguage.SI
              : PreferredLanguage.EN,
        },
        select: profileSelect,
      });
    });
  }

  async updatePreferredLanguage(
    userId: string,
    preferredLanguage: "EN" | "SI",
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredLanguage:
          preferredLanguage === "SI"
            ? PreferredLanguage.SI
            : PreferredLanguage.EN,
      },
    });
  }

  findPasswordRecord(userId: string): Promise<PasswordRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
  }

  async updatePasswordAndRevokeOtherSessions(
    userId: string,
    passwordHash: string,
    currentTokenHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
        select: { id: true },
      }),
      this.prisma.authSession.deleteMany({
        where: { userId, tokenHash: { not: currentTokenHash } },
      }),
    ]);
  }
}
