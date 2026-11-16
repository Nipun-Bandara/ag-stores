import { afterEach, describe, expect, it, vi } from "vitest";

import { authErrorResponse } from "@/lib/auth/http";
import { AuthServiceError } from "@/services/auth.service";

afterEach(() => vi.restoreAllMocks());

describe("authentication error responses", () => {
  it.each([
    { code: "P1001" },
    { code: "ETIMEDOUT" },
    new AggregateError([{ code: "ENETUNREACH" }]),
    { meta: { driverAdapterError: { cause: { kind: "SocketTimeout" } } } },
  ])("reports database connectivity failures as unavailable", async (error) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = authErrorResponse(error);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message:
          "The sign-in service cannot connect to the database. Please try again shortly.",
      },
    });
  });

  it("preserves invalid credential responses", async () => {
    const response = authErrorResponse(
      new AuthServiceError(
        "INVALID_CREDENTIALS",
        "Invalid mobile number or password.",
        401,
      ),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("keeps unexpected errors private and distinct from connectivity failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = {
      code: "P2022",
      message: "private database details",
      cause: null as unknown,
    };
    error.cause = error;
    const response = authErrorResponse(error);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database details");
  });
});
