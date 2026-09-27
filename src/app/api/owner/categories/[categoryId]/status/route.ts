import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { categoryErrorResponse } from "@/lib/category-http";
import { CategoryError, setCategoryStatus } from "@/services/category.service";
import { categoryIdSchema, categoryStatusSchema } from "@/validations/category";

type CategoryContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: NextRequest, context: CategoryContext) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = categoryStatusSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Category status is invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const categoryId = categoryIdSchema.safeParse(
      (await context.params).categoryId,
    );
    if (!categoryId.success) {
      throw new CategoryError("CATEGORY_NOT_FOUND", "Category not found.", 404);
    }
    return successResponse(
      await setCategoryStatus(authorization.user, categoryId.data, parsed.data),
    );
  } catch (error) {
    return categoryErrorResponse(error);
  }
}
