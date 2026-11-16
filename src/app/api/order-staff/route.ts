import type { NextRequest } from "next/server";
import { requireApiAnyRole } from "@/lib/auth/request";
import { successResponse, errorResponse } from "@/lib/api-response";
import { staffErrorResponse } from "@/lib/staff-http";
import { getOrderStaff, saveOrderStaff } from "@/services/order-staff.service";
import { orderStaffSchema } from "@/validations/order-staff";
export async function GET(request: NextRequest) {
  const auth = await requireApiAnyRole(request, ["SHOP_OWNER", "ADMIN"]);
  if (!auth.authorized) return auth.response;
  try {
    return successResponse(await getOrderStaff(auth.user));
  } catch (error) {
    return staffErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireApiAnyRole(request, ["SHOP_OWNER", "ADMIN"]);
  if (!auth.authorized) return auth.response;
  const parsed = orderStaffSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Staff details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  try {
    return successResponse(await saveOrderStaff(auth.user, parsed.data), {
      status: 201,
    });
  } catch (error) {
    return staffErrorResponse(error);
  }
}
