import {
  PreferredLanguage,
  Prisma,
  type PrismaClient,
  UserRole,
} from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/types/auth";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  preferredLanguage: true,
  status: true,
} satisfies Prisma.UserSelect;

export interface ProfileUpdateRecord {
  name: string;
  phone: string | null;
  preferredLanguage: "EN" | "SI";
}

export interface PasswordRecord {
  passwordHash: string;
}

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

  async findCustomerById(userId: string): Promise<AuthenticatedUser | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, role: UserRole.CUSTOMER },
      select: profileSelect,
    });
  }

  async updateCustomer(
    userId: string,
    input: ProfileUpdateRecord,
  ): Promise<AuthenticatedUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
        preferredLanguage:
          input.preferredLanguage === "SI"
            ? PreferredLanguage.SI
            : PreferredLanguage.EN,
      },
      select: profileSelect,
    });
  }

  async updatePreferredLanguage(
    userId: string,
    preferredLanguage: "EN" | "SI",
  ): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, role: UserRole.CUSTOMER },
      data: {
        preferredLanguage:
          preferredLanguage === "SI"
            ? PreferredLanguage.SI
            : PreferredLanguage.EN,
      },
    });
  }

  async findPasswordRecord(userId: string): Promise<PasswordRecord | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, role: UserRole.CUSTOMER },
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
