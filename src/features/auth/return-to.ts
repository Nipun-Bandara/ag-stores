/** Accept only local destinations, never external URLs or another auth page. */
export function safeAuthReturnTo(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  ) {
    return undefined;
  }

  const pathname = new URL(value, "http://localhost").pathname;
  if (/^\/(?:en\/|si\/)?(?:auth|login|register)(?:\/|$)/.test(pathname)) {
    return undefined;
  }

  return value;
}
