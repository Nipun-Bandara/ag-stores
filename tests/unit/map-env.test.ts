import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { parsePublicMapEnv } from "@/validations/map-env";

describe("public map environment validation", () => {
  it("defaults to a disabled provider without a key", () => {
    expect(parsePublicMapEnv({})).toEqual({
      NEXT_PUBLIC_MAP_PROVIDER: "disabled",
    });
  });

  it("accepts a public Mapbox browser token", () => {
    expect(
      parsePublicMapEnv({
        NEXT_PUBLIC_MAP_PROVIDER: "mapbox",
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: "pk.public-test-token",
      }),
    ).toEqual({
      NEXT_PUBLIC_MAP_PROVIDER: "mapbox",
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: "pk.public-test-token",
    });
  });

  it("rejects missing keys and server-secret tokens for Mapbox", () => {
    expect(() =>
      parsePublicMapEnv({ NEXT_PUBLIC_MAP_PROVIDER: "mapbox" }),
    ).toThrow(ZodError);
    expect(() =>
      parsePublicMapEnv({
        NEXT_PUBLIC_MAP_PROVIDER: "mapbox",
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: "sk.server-secret",
      }),
    ).toThrow(ZodError);
  });

  it("rejects a secret token even when the provider is disabled", () => {
    expect(() =>
      parsePublicMapEnv({
        NEXT_PUBLIC_MAP_PROVIDER: "disabled",
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: "sk.server-secret",
      }),
    ).toThrow(ZodError);
  });
});
