"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { safeAuthReturnTo } from "@/features/auth/return-to";
import {
  DASHBOARD_BY_ROLE,
  canAccessWorkspace,
  isRole,
  navigationPath,
} from "@/lib/navigation";
import { isLocale, localeFromPreference, routePath } from "@/lib/i18n/config";
import type { AuthenticatedUser } from "@/types/auth";
import type { RegistrationInput } from "@/validations/auth";

interface LoginRequest {
  identifier: string;
  password: string;
}
interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (credentials: LoginRequest, returnTo?: string) => Promise<void>;
  register: (payload: RegistrationInput, returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
interface AuthResponse {
  data?: AuthenticatedUser;
  error?: { message?: string };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const t = useText();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionVersion = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    const version = sessionVersion.current;
    void fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as AuthResponse;
        if (!controller.signal.aborted && version === sessionVersion.current) {
          setUser(
            response.ok && payload.data && isRole(payload.data.role)
              ? payload.data
              : null,
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted && version === sessionVersion.current)
          setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function startSession(
    path: string,
    body: LoginRequest | RegistrationInput,
    returnTo?: string,
  ) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as AuthResponse;
    if (!response.ok || !payload.data || !isRole(payload.data.role)) {
      throw new Error(
        t(payload.error?.message ?? "Unable to sign in. Please try again."),
      );
    }
    sessionVersion.current += 1;
    setUser(payload.data);
    setIsLoading(false);
    const requested = safeAuthReturnTo(returnTo);
    const currentLocale = pathname.split("/")[1];
    const requestedLocale = requested?.split("/")[1];
    const locale = isLocale(requestedLocale)
      ? requestedLocale
      : isLocale(currentLocale)
        ? currentLocale
        : localeFromPreference(payload.data.preferredLanguage);
    const localized = isLocale(requestedLocale) || isLocale(currentLocale);
    const target =
      requested &&
      navigationPath(requested.split("?")[0]!) !== "/dashboard" &&
      canAccessWorkspace(payload.data.role, requested.split("?")[0]!)
        ? routePath(navigationPath(requested), locale, localized)
        : routePath(DASHBOARD_BY_ROLE[payload.data.role], locale, localized);
    router.replace(target);
    router.refresh();
  }

  const login = (credentials: LoginRequest, returnTo?: string) =>
    startSession("/api/auth/login", credentials, returnTo);
  const register = (payload: RegistrationInput, returnTo?: string) =>
    startSession("/api/auth/register", payload, returnTo);
  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok)
      throw new Error(t("Unable to sign out. Please try again."));
    sessionVersion.current += 1;
    setUser(null);
    setIsLoading(false);
    const locale = pathname.split("/")[1];
    router.replace(
      routePath("/auth", isLocale(locale) ? locale : "en", isLocale(locale)),
    );
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
