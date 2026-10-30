import { describe, expect, it } from "vitest";

import {
  categoryCreateSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
} from "@/validations/category";

const shopId = "00000000-0000-4000-8000-000000000001";

describe("category validation", () => {
  it("normalizes category names", () => {
    expect(
      categoryCreateSchema.parse({
        shopId,
        nameEn: "  Household  ",
        nameSi: "  ගෘහ භාණ්ඩ  ",
      }),
    ).toEqual({
      shopId,
      nameEn: "Household",
      nameSi: "ගෘහ භාණ්ඩ",
    });
    expect(categoryUpdateSchema.parse({ nameEn: "Fresh", nameSi: "" })).toEqual(
      { nameEn: "Fresh", nameSi: null },
    );
  });

  it("rejects missing names, invalid shops, unknown fields, and statuses", () => {
    expect(
      categoryCreateSchema.safeParse({ shopId: "invalid", nameEn: "" }).success,
    ).toBe(false);
    expect(
      categoryUpdateSchema.safeParse({ nameEn: "Valid", shopId }).success,
    ).toBe(false);
    expect(categoryStatusSchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false,
    );
  });
});
