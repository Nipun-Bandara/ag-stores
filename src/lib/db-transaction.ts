import { Prisma } from "@/generated/prisma/client";

export function isSerializableTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function withSerializableRetry<T>(
  operation: () => Promise<T>,
  maximumAttempts = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isSerializableTransactionConflict(error) ||
        attempt === maximumAttempts
      ) {
        throw error;
      }
    }
  }
  throw new Error("Serializable transaction retry loop exhausted.");
}
