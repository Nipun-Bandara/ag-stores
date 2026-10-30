import { errorResponse, successResponse } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/auth/cookie";
import { authErrorResponse } from "@/lib/auth/http";
import { localeFromPreference } from "@/lib/i18n/config";
import { setLocaleCookie } from "@/lib/i18n/cookie";
import {
  applyRateLimitHeaders,
  clearAuthAttempts,
  consumeAuthAttempt,
} from "@/lib/security/auth-rate-limit";
import { requireSameOrigin } from "@/lib/security/request-origin";
import { login } from "@/services/auth.service";
import { loginSchema } from "@/validations/auth";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Login details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const rateLimit = consumeAuthAttempt(
    request,
    "login",
    parsed.data.identifier,
  );
  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      errorResponse(
        {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Try again later.",
        },
        429,
      ),
      rateLimit,
    );
  }

  try {
    const result = await login(parsed.data);
    clearAuthAttempts(request, "login", parsed.data.identifier);
    const response = successResponse(result.user);
    response.headers.set("Cache-Control", "no-store");
    setSessionCookie(response, result.session);
    setLocaleCookie(
      response,
      localeFromPreference(result.user.preferredLanguage),
    );
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
