import { z } from "zod";

const moneySchema = z
  .preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z
      .string()
      .trim()
      .regex(
        /^\d{1,10}(?:\.\d{1,2})?$/,
        "Enter a non-negative amount with at most 2 decimal places.",
      ),
  )
  .transform((value) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return `${BigInt(whole).toString()}.${fraction.padEnd(2, "0")}`;
  });

const coordinateSchema = (minimum: number, maximum: number, label: string) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .finite()
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be at most ${maximum}.`);

const radiusSchema = z
  .preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z
      .string()
      .trim()
      .regex(
        /^\d{1,5}(?:\.\d{1,2})?$/,
        "Delivery radius must be a positive number with at most 2 decimal places.",
      ),
  )
  .transform((value, context) => {
    if (Number(value) <= 0) {
      context.addIssue({
        code: "custom",
        message: "Delivery radius must be greater than zero.",
      });
      return z.NEVER;
    }
    const [whole = "0", fraction = ""] = value.split(".");
    return `${BigInt(whole).toString()}.${fraction.padEnd(2, "0")}`;
  });

export const shopSettingsUpdateSchema = z
  .object({
    shopId: z.uuid(),
    name: z.string().trim().min(2).max(180),
    address: z.string().trim().min(5).max(1000),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Use an international number such as +94112345678.",
      ),
    latitude: coordinateSchema(-90, 90, "Latitude"),
    longitude: coordinateSchema(-180, 180, "Longitude"),
    isOpen: z.boolean(),
    minimumOrderAmount: moneySchema,
    deliveryFee: moneySchema,
    maximumDeliveryRadiusKm: radiusSchema,
  })
  .strict();

export type ShopSettingsUpdateInput = z.infer<typeof shopSettingsUpdateSchema>;
