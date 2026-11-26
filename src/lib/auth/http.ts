import { errorResponse } from "@/lib/api-response";
import { AuthServiceError } from "@/services/auth.service";

const connectionCodes = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
]);
const connectionKinds = new Set([
  "DatabaseNotReachable",
  "ConnectionClosed",
  "SocketTimeout",
]);

function isConnectionFailure(
  error: unknown,
  seen = new Set<object>(),
): boolean {
  if (!error || typeof error !== "object" || seen.has(error)) return false;
  seen.add(error);
  const value = error as Record<string, unknown>;
  if (
    (typeof value.code === "string" && connectionCodes.has(value.code)) ||
    (typeof value.kind === "string" && connectionKinds.has(value.kind))
  )
    return true;

  return (
    [value.cause, value.meta, value.driverAdapterError].some((cause) =>
      isConnectionFailure(cause, seen),
    ) ||
    (Array.isArray(value.errors) &&
      value.errors.some((cause) => isConnectionFailure(cause, seen)))
  );
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthServiceError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Authentication request failed", error);
  if (isConnectionFailure(error)) {
    return errorResponse(
      {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message:
          "The sign-in service cannot connect to the database. Please try again shortly.",
      },
      503,
    );
  }
  return errorResponse(
    {
      code: "AUTHENTICATION_ERROR",
      message: "Unable to complete the request.",
    },
    500,
  );
}
