import { describe, expect, it } from "vitest";

import { MapboxStaticMapProvider } from "@/features/maps/providers/mapbox-static.provider";

describe("MapboxStaticMapProvider", () => {
  it("builds a static map URL from markers without making a request", () => {
    const provider = new MapboxStaticMapProvider("pk.public-test-token");
    const url = provider.buildStaticMapUrl(
      [
        {
          id: "shop",
          kind: "shop",
          label: "Shop",
          markerLabel: "S",
          latitude: 6.927079,
          longitude: 79.861244,
        },
        {
          id: "stop-1",
          kind: "delivery-stop",
          label: "Stop 1",
          markerLabel: "1",
          sequence: 1,
          latitude: 6.91,
          longitude: 79.85,
        },
      ],
      { width: 1000, height: 500 },
    );

    expect(url).toContain(
      "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/",
    );
    expect(url).toContain("pin-l-S+111827(79.861244,6.927079)");
    expect(url).toContain("pin-l-1+2563eb(79.85,6.91)");
    expect(url).toContain("/auto/1000x500@2x?");
    expect(url).toContain("access_token=pk.public-test-token");
  });
});
