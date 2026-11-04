import { Prisma } from "@/generated/prisma/client";

export function isSerializableTransactionConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  // Row locks use raw SQL: Prisma's pg adapter wraps SQLSTATE 40001/40P01 as P2010.
  if (error.code !== "P2010") return false;
  const adapter = error.meta?.driverAdapterError as
    { cause?: { kind?: string; originalCode?: string } } | undefined;
  return (
    error.meta?.code === "40001" ||
    error.meta?.code === "40P01" ||
    adapter?.cause?.kind === "TransactionWriteConflict" ||
    adapter?.cause?.originalCode === "40001" ||
    adapter?.cause?.originalCode === "40P01"
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
