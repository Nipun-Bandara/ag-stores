import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import {
  errorResponse,
  fieldErrors,
  successResponse,
} from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { checkoutErrorResponse } from "@/lib/checkout-http";
import { checkoutIdempotent } from "@/services/checkout.service";
import { checkoutSchema, idempotencyKeySchema } from "@/validations/checkout";

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Checkout details are invalid.",
        details: fieldErrors(parsed.error),
      },
      400,
    );
  }

  const keyHeader = request.headers.get("idempotency-key");
  const idempotencyKey =
    keyHeader === null ? null : idempotencyKeySchema.safeParse(keyHeader);
  if (idempotencyKey && !idempotencyKey.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "The Idempotency-Key header is invalid.",
      },
      400,
    );
  }

  try {
    const result = await checkoutIdempotent(authorization.user, parsed.data, {
      idempotencyKey: idempotencyKey?.data ?? null,
    });
    return successResponse(result.order, {
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
