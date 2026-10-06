import { describe, expect, it } from "vitest";

import { buildDeliveryMapData } from "@/features/maps/delivery-map-data";

describe("delivery map marker data", () => {
  it("creates a shop marker and numbered stops in delivery sequence", () => {
    const result = buildDeliveryMapData({
      shop: {
        id: "shop-1",
        name: "Central Shop",
        latitude: "6.927079",
        longitude: "79.861244",
      },
      stops: [
        {
          id: "order-3",
          sequence: 3,
          label: "Other",
          latitude: 6.94,
          longitude: 79.88,
        },
        {
          id: "order-1",
          sequence: 1,
          label: "Home",
          latitude: 6.91,
          longitude: 79.85,
        },
        {
          id: "order-2",
          sequence: 2,
          label: "Office",
          latitude: 6.92,
          longitude: 79.87,
        },
      ],
    });

    expect(result.omittedLocations).toEqual([]);
    expect(result.markers).toMatchObject([
      {
        id: "shop-1",
        kind: "shop",
        label: "Shop · Central Shop",
        markerLabel: "S",
      },
      {
        id: "order-1",
        kind: "delivery-stop",
        label: "Stop 1 · Home",
        markerLabel: "1",
        sequence: 1,
      },
      {
        id: "order-2",
        label: "Stop 2 · Office",
        markerLabel: "2",
        sequence: 2,
      },
      {
        id: "order-3",
        label: "Stop 3 · Other",
        markerLabel: "3",
        sequence: 3,
      },
    ]);
  });

  it("omits invalid latitude and longitude values", () => {
    const result = buildDeliveryMapData({
      shop: {
        name: "Invalid Shop",
        latitude: 91,
        longitude: 79.8,
      },
      stops: [
        {
          id: "bad-longitude",
          sequence: 1,
          label: "Home",
          latitude: 6.9,
          longitude: -181,
        },
        {
          id: "not-numeric",
          sequence: 2,
          label: "Office",
          latitude: "north",
          longitude: "east",
        },
      ],
    });

    expect(result.markers).toEqual([]);
    expect(result.omittedLocations).toEqual(["Shop", "Stop 1", "Stop 2"]);
  });

  it("handles missing coordinates without throwing and preserves valid markers", () => {
    const result = buildDeliveryMapData({
      shop: null,
      stops: [
        {
          id: "missing",
          sequence: 1,
          label: "Home",
          latitude: null,
          longitude: null,
        },
        {
          id: "valid",
          sequence: 2,
          label: "Office",
          latitude: 0,
          longitude: 0,
        },
      ],
    });

    expect(result.markers).toMatchObject([
      { id: "valid", label: "Stop 2 · Office", latitude: 0, longitude: 0 },
    ]);
    expect(result.omittedLocations).toEqual(["Shop", "Stop 1"]);
  });
});
