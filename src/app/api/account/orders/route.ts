import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { customerOrderErrorResponse } from "@/lib/customer-order-http";
import { listCustomerOrders } from "@/services/customer-order.service";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await listCustomerOrders(authorization.user));
  } catch (error) {
    return customerOrderErrorResponse(error);
  }
}
