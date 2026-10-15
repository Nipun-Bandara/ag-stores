export const describeApiError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default describeApiError;
