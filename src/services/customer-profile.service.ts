import { getDb } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";
import { preferenceFromLocale, type Locale } from "@/lib/i18n/config";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  CurrentPasswordRequiredError,
  IncorrectCurrentPasswordError,
  PrismaCustomerProfileRepository,
  type CustomerProfileRepository,
} from "@/repositories/customer-profile.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  PasswordChangeInput,
  ProfileUpdateInput,
} from "@/validations/profile";
import { profileUpdateSchema } from "@/validations/profile";

type ProfileErrorCode =
  | "PROFILE_NOT_FOUND"
  | "DUPLICATE_PHONE"
  | "CURRENT_PASSWORD_REQUIRED"
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

export async function getCustomerProfile(
  user: AuthenticatedUser,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<AuthenticatedUser> {
  const profile = await repository.findCustomerById(user.id);

  if (!profile) {
    throw new CustomerProfileError(
      "PROFILE_NOT_FOUND",
      "Profile not found.",
      404,
    );
  }

  return profile;
}

export async function updateCustomerProfile(
  user: AuthenticatedUser,
  input: ProfileUpdateInput,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<AuthenticatedUser> {
  input = profileUpdateSchema.parse(input);
  try {
    return await repository.updateCustomer(user.id, input);
  } catch (error) {
    if (error instanceof CurrentPasswordRequiredError) {
      throw new CustomerProfileError(
        "CURRENT_PASSWORD_REQUIRED",
        "Enter your current password to change your mobile number.",
        400,
      );
    }
    if (error instanceof IncorrectCurrentPasswordError) {
      throw new CustomerProfileError(
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect.",
        400,
      );
    }
    if (isUniqueConstraintError(error)) {
      throw new CustomerProfileError(
        "DUPLICATE_PHONE",
        "That mobile number or email is already associated with an account.",
        409,
      );
    }
    throw error;
  }
}

export async function updateCustomerLanguage(
  user: AuthenticatedUser,
  locale: Locale,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<void> {
  await repository.updatePreferredLanguage(
    user.id,
    preferenceFromLocale(locale),
  );
}

export async function changeCustomerPassword(
  user: AuthenticatedUser,
  sessionToken: string,
  input: PasswordChangeInput,
  repository: CustomerProfileRepository = getProfileRepository(),
): Promise<void> {
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
