import type {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  role: UserRole;
  preferredLanguage: PreferredLanguage;
  status: UserStatus;
}

export interface SessionCredentials {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  session: SessionCredentials;
}
