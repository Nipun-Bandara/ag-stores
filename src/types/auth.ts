import type {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
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
