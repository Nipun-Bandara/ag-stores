import {
  PreferredLanguage,
  Prisma,
  type PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { AuthenticatedUser, SessionCredentials } from "@/types/auth";

const authenticatedUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  preferredLanguage: true,
  status: true,
} satisfies Prisma.UserSelect;

export interface CustomerRegistrationRecord {
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  preferredLanguage: "EN" | "SI";
}

export interface LoginUser extends AuthenticatedUser {
  passwordHash: string;
}

export interface AuthRepository {
  findDuplicate(email?: string, phone?: string): Promise<boolean>;
  createCustomerWithSession(
    input: CustomerRegistrationRecord,
    session: SessionCredentials,
  ): Promise<AuthenticatedUser>;
  findLoginUser(identifier: string): Promise<LoginUser | null>;
  createSession(userId: string, session: SessionCredentials): Promise<void>;
  findActiveSessionUser(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findDuplicate(email?: string, phone?: string): Promise<boolean> {
    const duplicate = await this.prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
      select: { id: true },
    });

    return duplicate !== null;
  }

  async createCustomerWithSession(
    input: CustomerRegistrationRecord,
    session: SessionCredentials,
  ): Promise<AuthenticatedUser> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: input.name,
          ...(input.email ? { email: input.email } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          passwordHash: input.passwordHash,
          role: UserRole.CUSTOMER,
          preferredLanguage:
            input.preferredLanguage === "SI"
              ? PreferredLanguage.SI
              : PreferredLanguage.EN,
          status: UserStatus.ACTIVE,
        },
        select: authenticatedUserSelect,
      });

      await transaction.authSession.create({
        data: {
          userId: user.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        },
      });

      return user;
    });
  }

  async findLoginUser(identifier: string): Promise<LoginUser | null> {
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;

    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }],
      },
      select: {
        ...authenticatedUserSelect,
        passwordHash: true,
      },
    });
  }

  async createSession(
    userId: string,
    session: SessionCredentials,
  ): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      },
    });
  }

  async findActiveSessionUser(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: now },
        user: { status: UserStatus.ACTIVE },
      },
      select: { user: { select: authenticatedUserSelect } },
    });

    return session?.user ?? null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.prisma.authSession.deleteMany({ where: { tokenHash } });
  }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
