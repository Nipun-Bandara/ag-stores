import { errorResponse } from "@/lib/api-response";
import { AuthServiceError } from "@/services/auth.service";

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthServiceError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Authentication request failed", error);
  return errorResponse(
    {
      code: "AUTHENTICATION_ERROR",
      message: "Unable to complete the request.",
    },
    500,
  );
}
