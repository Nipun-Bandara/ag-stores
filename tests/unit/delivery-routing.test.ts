import { describe, expect, it } from "vitest";

import {
  BasicGeographicRoutingEngine,
  suggestDeliveryGroups,
  type DeliveryRoutingInput,
} from "@/services/delivery-routing.service";

const shop = { latitude: 6.906944, longitude: 79.85 };

describe("basic delivery routing suggestions", () => {
  it("groups nearby orders traveling in a similar direction", () => {
    const result = suggestDeliveryGroups({
      shop,
      orders: [
        { orderId: "order-a", latitude: 6.91, longitude: 79.855 },
        { orderId: "order-b", latitude: 6.912, longitude: 79.857 },
        { orderId: "order-c", latitude: 6.914, longitude: 79.859 },
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      id: "suggested-group-1",
      direction: "Northeast",
      orderIds: ["order-a", "order-b", "order-c"],
    });
    expect(result.groups[0]!.maximumPairDistanceKm).toBeLessThan(1);
    expect(result.ungroupedOrderIds).toEqual([]);
  });

  it("does not describe distant orders as a nearby group", () => {
    const result = suggestDeliveryGroups({
      shop,
      orders: [
        { orderId: "near", latitude: 6.91, longitude: 79.855 },
        { orderId: "distant", latitude: 7.2, longitude: 80.2 },
      ],
    });

    expect(result.groups).toEqual([]);
    expect(result.ungroupedOrderIds).toEqual(["distant", "near"]);
  });

  it("returns an empty deterministic result for an empty dataset", () => {
    expect(suggestDeliveryGroups({ shop, orders: [] })).toEqual({
      groups: [],
      ungroupedOrderIds: [],
      invalidOrderIds: [],
      shopCoordinatesValid: true,
      method: "BASIC_GEOGRAPHIC_GROUPING",
    });
  });

  it("leaves a single valid order ungrouped", () => {
    const result = suggestDeliveryGroups({
      shop,
      orders: [{ orderId: "only-order", latitude: 6.91, longitude: 79.855 }],
    });

    expect(result.groups).toEqual([]);
    expect(result.ungroupedOrderIds).toEqual(["only-order"]);
  });

  it("excludes invalid delivery coordinates without failing valid orders", () => {
    const result = suggestDeliveryGroups({
      shop,
      orders: [
        { orderId: "bad-latitude", latitude: 91, longitude: 79.8 },
        { orderId: "bad-longitude", latitude: 6.9, longitude: -181 },
        { orderId: "valid", latitude: 6.91, longitude: 79.855 },
      ],
    });

    expect(result.invalidOrderIds).toEqual(["bad-latitude", "bad-longitude"]);
    expect(result.ungroupedOrderIds).toEqual(["valid"]);
  });

  it("handles invalid shop coordinates gracefully", () => {
    const result = suggestDeliveryGroups({
      shop: { latitude: Number.NaN, longitude: 79.85 },
      orders: [
        { orderId: "valid", latitude: 6.91, longitude: 79.855 },
        { orderId: "invalid", latitude: 95, longitude: 79.8 },
      ],
    });

    expect(result.shopCoordinatesValid).toBe(false);
    expect(result.groups).toEqual([]);
    expect(result.ungroupedOrderIds).toEqual(["valid"]);
    expect(result.invalidOrderIds).toEqual(["invalid"]);
  });

  it("produces identical output regardless of input order", () => {
    const orders = [
      { orderId: "order-c", latitude: 6.914, longitude: 79.859 },
      { orderId: "order-a", latitude: 6.91, longitude: 79.855 },
      { orderId: "far", latitude: 7.2, longitude: 80.2 },
      { orderId: "order-b", latitude: 6.912, longitude: 79.857 },
    ];
    const forward = suggestDeliveryGroups({ shop, orders });
    const reversed = suggestDeliveryGroups({
      shop,
      orders: [...orders].reverse(),
    });

    expect(reversed).toEqual(forward);
  });

  it("can be replaced through the routing-engine interface", () => {
    const input: DeliveryRoutingInput = { shop, orders: [] };
    const replacement = {
      suggest: () => ({
        groups: [],
        ungroupedOrderIds: [],
        invalidOrderIds: [],
        shopCoordinatesValid: true,
        method: "BASIC_GEOGRAPHIC_GROUPING" as const,
      }),
    };

    expect(suggestDeliveryGroups(input, replacement)).toEqual(
      replacement.suggest(),
    );
    expect(new BasicGeographicRoutingEngine()).toBeDefined();
  });
});
