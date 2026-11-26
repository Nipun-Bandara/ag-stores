import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAnyRole } from "@/lib/auth/request";
import { successResponse, errorResponse } from "@/lib/api-response";
import { returnErrorResponse } from "@/lib/return-http";
import { reviewOrderReturn } from "@/services/order-return.service";
import { returnActionSchema } from "@/validations/order-return";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; returnId: string }> },
) {
  const auth = await requireApiAnyRole(request, [
    "SHOP_OWNER",
    "ORDER_STAFF",
    "ADMIN",
  ]);
  if (!auth.authorized) return auth.response;
  const ids = z
    .object({ orderId: z.uuid(), returnId: z.uuid() })
    .safeParse(await params);
  const body = returnActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!ids.success || !body.success)
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Return details are invalid." },
      400,
    );
  try {
    return successResponse(
      await reviewOrderReturn(
        auth.user,
        ids.data.orderId,
        ids.data.returnId,
        body.data,
      ),
    );
  } catch (error) {
    return returnErrorResponse(error);
  }
}
