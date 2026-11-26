import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAnyRole } from "@/lib/auth/request";
import { successResponse, errorResponse } from "@/lib/api-response";
import { returnErrorResponse } from "@/lib/return-http";
import {
  getOrderReturns,
  recordOrderReturn,
} from "@/services/order-return.service";
import { recordReturnSchema } from "@/validations/order-return";
const roles = ["SHOP_OWNER", "ORDER_STAFF", "ADMIN"] as const;
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireApiAnyRole(request, roles);
  if (!auth.authorized) return auth.response;
  const id = z.uuid().safeParse((await params).orderId);
  if (!id.success)
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Order details are invalid." },
      400,
    );
  try {
    return successResponse(await getOrderReturns(auth.user, id.data));
  } catch (error) {
    return returnErrorResponse(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireApiAnyRole(request, roles);
  if (!auth.authorized) return auth.response;
  const id = z.uuid().safeParse((await params).orderId);
  const body = recordReturnSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!id.success || !body.success)
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Return details are invalid." },
      400,
    );
  try {
    return successResponse(
      await recordOrderReturn(auth.user, id.data, body.data),
      { status: 201 },
    );
  } catch (error) {
    return returnErrorResponse(error);
  }
}
