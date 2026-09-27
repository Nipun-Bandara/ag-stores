import { errorResponse, successResponse } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/auth/cookie";
import { authErrorResponse } from "@/lib/auth/http";
import { login } from "@/services/auth.service";
import { loginSchema } from "@/validations/auth";

export async function POST(request: Request) {
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

  try {
    const result = await login(parsed.data);
    const response = successResponse(result.user);
    response.headers.set("Cache-Control", "no-store");
    setSessionCookie(response, result.session);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
