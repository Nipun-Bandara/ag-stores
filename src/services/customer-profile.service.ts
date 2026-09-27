import { getDb } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  PrismaCustomerProfileRepository,
  type CustomerProfileRepository,
} from "@/repositories/customer-profile.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  PasswordChangeInput,
  ProfileUpdateInput,
} from "@/validations/profile";

type ProfileErrorCode =
  | "CUSTOMER_ONLY"
  | "DUPLICATE_PHONE"
  | "CONTACT_REQUIRED"
  | "INVALID_CURRENT_PASSWORD";

export class CustomerProfileError extends Error {
  constructor(
    readonly code: ProfileErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CustomerProfileError";
  }
}

function getProfileRepository(): CustomerProfileRepository {
  return new PrismaCustomerProfileRepository(getDb());
}

function assertCustomer(user: AuthenticatedUser): void {
  if (user.role !== "CUSTOMER") {
    throw new CustomerProfileError(
      "CUSTOMER_ONLY",
      "Customer access is required.",
      403,
    );
  }
}

export async function getCustomerProfile(
  user: AuthenticatedUser,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<AuthenticatedUser> {
  assertCustomer(user);
  const profile = await repository.findCustomerById(user.id);

  if (!profile) {
    throw new CustomerProfileError(
      "CUSTOMER_ONLY",
      "Customer access is required.",
      403,
    );
  }

  return profile;
}

export async function updateCustomerProfile(
  user: AuthenticatedUser,
  input: ProfileUpdateInput,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<AuthenticatedUser> {
  assertCustomer(user);

  if (!user.email && !input.phone) {
    throw new CustomerProfileError(
      "CONTACT_REQUIRED",
      "An account must retain an email address or phone number.",
      400,
    );
  }

  try {
    return await repository.updateCustomer(user.id, input);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CustomerProfileError(
        "DUPLICATE_PHONE",
        "That phone number is already associated with an account.",
        409,
      );
    }
    throw error;
  }
}

export async function changeCustomerPassword(
  user: AuthenticatedUser,
  sessionToken: string,
  input: PasswordChangeInput,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<void> {
  assertCustomer(user);
  const record = await repository.findPasswordRecord(user.id);
  const currentPasswordMatches = record
    ? await verifyPassword(input.currentPassword, record.passwordHash)
    : false;

  if (!currentPasswordMatches) {
    throw new CustomerProfileError(
      "INVALID_CURRENT_PASSWORD",
      "Current password is incorrect.",
      400,
    );
  }

  const passwordHash = await hashPassword(input.newPassword);
  await repository.updatePasswordAndRevokeOtherSessions(
    user.id,
    passwordHash,
    hashSessionToken(sessionToken),
  );
}
