import { z } from "zod";

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const availableDeliveryOrderFiltersSchema = z
  .object({
    sortBy: z.enum(["distance", "createdAt"]).default("createdAt"),
    direction: z.enum(["asc", "desc"]).optional(),
    maxDistanceKm: z.coerce.number().positive().max(500).optional(),
    createdAfter: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isCalendarDate, "Enter a valid date.")
      .optional(),
  })
  .strict()
  .transform((input) => ({
    ...input,
    direction:
      input.direction ?? (input.sortBy === "distance" ? "asc" : "desc"),
  }));

export type AvailableDeliveryOrderFilters = z.infer<
  typeof availableDeliveryOrderFiltersSchema
>;
