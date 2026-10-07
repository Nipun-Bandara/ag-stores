import { errorResponse, successResponse } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/auth/cookie";
import { authErrorResponse } from "@/lib/auth/http";
import { localeFromPreference } from "@/lib/i18n/config";
import { setLocaleCookie } from "@/lib/i18n/cookie";
import { registerCustomer } from "@/services/auth.service";
import { registrationSchema } from "@/validations/auth";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Registration details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const result = await registerCustomer(parsed.data);
    const response = successResponse(result.user, { status: 201 });
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
