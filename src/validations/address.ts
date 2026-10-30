import { z } from "zod";

function coordinateSchema(label: string, minimum: number, maximum: number) {
  return z
    .union([z.number(), z.string().trim().min(1, `${label} is required.`)])
    .transform((value) => (typeof value === "number" ? value : Number(value)))
    .pipe(
      z
        .number({ error: `${label} must be a number.` })
        .finite(`${label} must be finite.`)
        .min(minimum, `${label} must be at least ${minimum}.`)
        .max(maximum, `${label} must be at most ${maximum}.`),
    )
    .refine(
      (value) =>
        Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 0.000001,
      `${label} can contain at most 6 decimal places.`,
    );
}

export const addressInputSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1).max(1000),
    latitude: coordinateSchema("Latitude", -90, 90),
    longitude: coordinateSchema("Longitude", -180, 180),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const addressIdSchema = z.uuid();

export type AddressInput = z.infer<typeof addressInputSchema>;
