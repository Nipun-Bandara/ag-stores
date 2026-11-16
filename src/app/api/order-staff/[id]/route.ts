import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAnyRole } from "@/lib/auth/request";
import { successResponse, errorResponse } from "@/lib/api-response";
import { staffErrorResponse } from "@/lib/staff-http";
import {
  saveOrderStaff,
  setOrderStaffStatus,
} from "@/services/order-staff.service";
import { orderStaffSchema, staffStatusSchema } from "@/validations/order-staff";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAnyRole(request, ["SHOP_OWNER", "ADMIN"]);
  if (!auth.authorized) return auth.response;
  const id = z.uuid().safeParse((await params).id);
  const body = await request.json().catch(() => null);
  const status = staffStatusSchema.safeParse(body);
  const details = orderStaffSchema.safeParse(body);
  if (!id.success || (!status.success && !details.success))
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Staff details are invalid." },
      400,
    );
  try {
    return successResponse(
      status.success
        ? await setOrderStaffStatus(auth.user, id.data, status.data.status)
        : await saveOrderStaff(auth.user, details.data!, id.data),
    );
  } catch (error) {
    return staffErrorResponse(error);
  }
}
