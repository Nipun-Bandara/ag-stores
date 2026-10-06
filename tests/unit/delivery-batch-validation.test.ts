import { describe, expect, it } from "vitest";

import {
  completeDeliveryOrderSchema,
  createDeliveryBatchSchema,
  reorderDeliveryBatchSchema,
} from "@/validations/delivery-batch";

const firstOrderId = "11111111-1111-4111-8111-111111111111";
const secondOrderId = "22222222-2222-4222-8222-222222222222";

describe("delivery batch validation", () => {
  it("accepts one or more unique order identifiers", () => {
    expect(
      createDeliveryBatchSchema.parse({
        orderIds: [firstOrderId, secondOrderId],
      }),
    ).toEqual({ orderIds: [firstOrderId, secondOrderId] });
  });

  it("rejects an empty selection", () => {
    expect(createDeliveryBatchSchema.safeParse({ orderIds: [] }).success).toBe(
      false,
    );
  });

  it("rejects duplicate order identifiers", () => {
    expect(
      createDeliveryBatchSchema.safeParse({
        orderIds: [firstOrderId, firstOrderId],
      }).success,
    ).toBe(false);
  });

  it("rejects malformed identifiers and oversized batches", () => {
    expect(
      createDeliveryBatchSchema.safeParse({ orderIds: ["not-a-uuid"] }).success,
    ).toBe(false);
    expect(
      createDeliveryBatchSchema.safeParse({
        orderIds: Array.from(
          { length: 51 },
          (_, index) =>
            `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`,
        ),
      }).success,
    ).toBe(false);
  });

  it("validates reordering and terminal delivery outcomes", () => {
    expect(
      reorderDeliveryBatchSchema.safeParse({
        orderIds: [firstOrderId, secondOrderId],
      }).success,
    ).toBe(true);
    expect(
      reorderDeliveryBatchSchema.safeParse({
        orderIds: [firstOrderId, firstOrderId],
      }).success,
    ).toBe(false);
    expect(
      completeDeliveryOrderSchema.safeParse({ status: "DELIVERED" }).success,
    ).toBe(true);
    expect(
      completeDeliveryOrderSchema.safeParse({ status: "FAILED_DELIVERY" })
        .success,
    ).toBe(true);
    expect(
      completeDeliveryOrderSchema.safeParse({ status: "CANCELLED" }).success,
    ).toBe(false);
  });
});
