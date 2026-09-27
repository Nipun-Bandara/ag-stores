import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponseBody {
  success: false;
  error: ApiError;
}

export function successResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data }, init);
}

export function errorResponse(
  error: ApiError,
  status = 500,
): NextResponse<ErrorResponseBody> {
  return NextResponse.json({ success: false, error }, { status });
}
