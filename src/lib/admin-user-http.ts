import { errorResponse } from "@/lib/api-response";
import { AdminUserError } from "@/services/admin-user.service";

export function adminUserErrorResponse(error: unknown) {
  if (error instanceof AdminUserError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Admin user request failed", error);
  return errorResponse(
    { code: "ADMIN_USER_ERROR", message: "Unable to complete the request." },
    500,
  );
}
