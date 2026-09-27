import { describe, expect, it } from "vitest";

describe("database utility", () => {
  it("can be imported without connecting or validating the environment", async () => {
    const database = await import("@/db");

    expect(database.getDb).toBeTypeOf("function");
  });
});
