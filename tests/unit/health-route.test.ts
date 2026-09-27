import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns a successful health response", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: { status: "ok", service: "ag-stores" },
    });
    expect(body.data.timestamp).toEqual(expect.any(String));
  });
});
