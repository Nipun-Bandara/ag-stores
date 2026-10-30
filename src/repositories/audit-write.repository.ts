import {
  type AuditAction,
  type AuditEntityType,
  Prisma,
} from "@/generated/prisma/client";

const sensitiveKey =
  /password|passcode|secret|token|authorization|cookie|credential|session/i;

type SafeJsonValue =
  | string
  | number
  | boolean
  | null
  | SafeJsonValue[]
  | { [key: string]: SafeJsonValue };

export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

function sanitizeValue(value: unknown): SafeJsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map(sanitizeValue)
      .filter((item): item is SafeJsonValue => item !== undefined);
  }
  if (typeof value === "object" && value) {
    const result: Record<string, SafeJsonValue> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (sensitiveKey.test(key)) continue;
      const safeValue = sanitizeValue(nestedValue);
      if (safeValue !== undefined) result[key] = safeValue;
    }
    return result;
  }
  return undefined;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!metadata) return undefined;
  return sanitizeValue(metadata) as unknown as Prisma.InputJsonObject;
}

export function writeAuditLog(
  transaction: Prisma.TransactionClient,
  entry: AuditEntry,
): Promise<unknown> {
  const metadata = sanitizeAuditMetadata(entry.metadata);
  return transaction.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...(metadata ? { metadata } : {}),
    },
    select: { id: true },
  });
}
