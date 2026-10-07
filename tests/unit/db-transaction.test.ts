import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";

function conflict() {
  return new Prisma.PrismaClientKnownRequestError("serialization conflict", {
    code: "P2034",
    clientVersion: "test",
  });
}

describe("serializable transaction retry", () => {
  it("retries transient serialization conflicts", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue("completed");

    await expect(withSerializableRetry(operation)).resolves.toBe("completed");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated failures", async () => {
    const failure = new Error("permanent failure");
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(failure);

    await expect(withSerializableRetry(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
