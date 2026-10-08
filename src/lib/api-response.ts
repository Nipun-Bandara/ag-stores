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
  const response = NextResponse.json({ success: true as const, data }, init);
  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export function errorResponse(
  error: ApiError,
  status = 500,
): NextResponse<ErrorResponseBody> {
  const response = NextResponse.json(
    { success: false as const, error },
    { status },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
