/** Request header carrying the per-request CSP nonce to Server Components. */
export const NONCE_HEADER_NAME = "x-nonce";

const MAPBOX_ORIGINS = [
  "https://api.mapbox.com",
  "https://events.mapbox.com",
  "https://*.tiles.mapbox.com",
];

const REMOTE_IMAGE_ORIGINS = [
  "https://images.unsplash.com",
  "https://flowbite.com",
  "https://api.dicebear.com",
];

function storageOrigin(): string | null {
  try {
    const url = new URL(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    );
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function servedOverHttps(): boolean {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").protocol === "https:";
  } catch {
    return false;
  }
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Strict, nonce-based policy for rendered pages. Scripts run only with this
 * request's nonce ('strict-dynamic' extends trust to the chunks they load).
 * Styles still allow inline values: charts, maps, animation and toast
 * libraries set style attributes, which nonces cannot cover.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  environment: string | undefined = process.env.NODE_ENV,
): string {
  const development = environment === "development";
  const storage = storageOrigin();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // React uses eval for richer error stacks in development only.
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      ...REMOTE_IMAGE_ORIGINS,
      ...MAPBOX_ORIGINS,
      ...(storage ? [storage] : []),
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...MAPBOX_ORIGINS,
      ...(development ? ["ws:", "wss:"] : []),
    ],
    // Mapbox GL runs its renderer in a blob: worker.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  );
  // Only when the app is served over HTTPS; local `next start` (and the e2e
  // suite) runs on plain http://127.0.0.1, which this directive would break.
  if (!development && servedOverHttps()) {
    policy.push("upgrade-insecure-requests");
  }
  return policy.join("; ");
}
