import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { parseServerEnv } from "@/validations/env";

describe("environment validation", () => {
  it("accepts a valid PostgreSQL environment", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ag_stores",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toEqual({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ag_stores",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("rejects a missing database URL", () => {
    expect(() => parseServerEnv({ NODE_ENV: "test" })).toThrow(ZodError);
  });

  it("rejects a non-PostgreSQL database URL", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "mysql://localhost/ag_stores" }),
    ).toThrow(ZodError);
  });
});
