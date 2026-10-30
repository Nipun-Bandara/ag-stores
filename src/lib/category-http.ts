import { errorResponse } from "@/lib/api-response";
import { CategoryError } from "@/services/category.service";

export function categoryErrorResponse(error: unknown) {
  if (error instanceof CategoryError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Category request failed", error);
  return errorResponse(
    { code: "CATEGORY_ERROR", message: "Unable to complete the request." },
    500,
  );
}
