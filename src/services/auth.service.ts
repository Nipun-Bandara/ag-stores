import { getDb } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionCredentials,
  hashSessionToken,
} from "@/lib/auth/session-token";
import {
  isUniqueConstraintError,
  PrismaAuthRepository,
  type AuthRepository,
} from "@/repositories/auth.repository";
import type { AuthenticatedUser, AuthenticationResult } from "@/types/auth";
import {
  registrationSchema,
  type LoginInput,
  type RegistrationInput,
} from "@/validations/auth";

const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg$dMEA_1U4kLKQuqALZybXWPrR5wHwGtxma-fbKkXQQJmtS4Ik5zQzE3kgc0IJ87XhjwkkM2Or-oMyBnXyihsVWw";

export class AuthServiceError extends Error {
  constructor(
    readonly code: "DUPLICATE_ACCOUNT" | "INVALID_CREDENTIALS",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function getAuthRepository(): AuthRepository {
  return new PrismaAuthRepository(getDb());
}

export async function registerCustomer(
  input: RegistrationInput,
  repository: AuthRepository = getAuthRepository(),
): Promise<AuthenticationResult> {
  input = registrationSchema.parse(input);
  if (await repository.findDuplicate(input.email, input.phone)) {
    throw new AuthServiceError(
      "DUPLICATE_ACCOUNT",
      "An account already exists with that mobile number or email.",
      409,
    );
  }

  const passwordHash = await hashPassword(input.password);
  const session = createSessionCredentials();

  try {
    const user = await repository.createCustomerWithSession(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        preferredLanguage: input.preferredLanguage,
      },
      session,
    );

    return { user, session };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AuthServiceError(
        "DUPLICATE_ACCOUNT",
        "An account already exists with that mobile number or email.",
        409,
      );
    }
    throw error;
  }
}

export async function login(
  input: LoginInput,
  repository: AuthRepository = getAuthRepository(),
): Promise<AuthenticationResult> {
  const user = await repository.findLoginUser(input.identifier);
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches || user.status !== "ACTIVE") {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Invalid mobile number or password.",
      401,
    );
  }

  const session = createSessionCredentials();
  await repository.createSession(user.id, session);

  const safeUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    status: user.status,
  };
  return { user: safeUser, session };
}

export async function getUserForSessionToken(
  token: string | undefined,
  repository?: AuthRepository,
): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }

  return (repository ?? getAuthRepository()).findActiveSessionUser(
    hashSessionToken(token),
    new Date(),
  );
}

export async function logout(
  token: string | undefined,
  repository?: AuthRepository,
): Promise<void> {
  if (token) {
    await (repository ?? getAuthRepository()).deleteSession(
      hashSessionToken(token),
    );
  }
}
