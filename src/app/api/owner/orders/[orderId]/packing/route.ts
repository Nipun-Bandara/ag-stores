import type { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { PackingError, savePackedWeight } from "@/services/packing.service";
import { orderIdSchema } from "@/validations/order";
import { packedWeightUpdateSchema } from "@/validations/packing";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;
  const orderId = orderIdSchema.safeParse((await context.params).orderId);
  const body = packedWeightUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!orderId.success || !body.success)
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Packed weight details are invalid.",
        details: body.success ? undefined : body.error.flatten().fieldErrors,
      },
      400,
    );
  try {
    return successResponse(
      await savePackedWeight(authorization.user, orderId.data, body.data),
    );
  } catch (error) {
    if (error instanceof PackingError)
      return errorResponse(
        { code: error.code, message: error.message },
        error.status,
      );
    console.error("Packed weight update failed", error);
    return errorResponse(
      { code: "PACKING_ERROR", message: "Unable to save packed weight." },
      500,
    );
  }
}
