import { errorResponse } from "@/lib/api-response";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type RequestMetadata = Pick<Request, "headers" | "method" | "url">;

function configuredApplicationOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Cookie-authenticated mutations must originate from this application.
 * Missing browser metadata is accepted for non-browser/server clients, while
 * browsers that send Origin or Sec-Fetch-Site are checked explicitly.
 */
export function isSameOriginMutation(request: RequestMetadata): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set([requestOrigin]);
  const applicationOrigin = configuredApplicationOrigin();
  if (applicationOrigin) allowedOrigins.add(applicationOrigin);

  return allowedOrigins.has(origin);
}

export function requireSameOrigin(request: RequestMetadata) {
  if (isSameOriginMutation(request)) return null;

  return errorResponse(
    {
      code: "INVALID_REQUEST_ORIGIN",
      message: "The request origin is not allowed.",
    },
    403,
  );
}
