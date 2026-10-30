import { z } from "zod";

import { OrderStatus } from "@/generated/prisma/client";

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const ownerOrderFiltersSchema = z
  .object({
    status: z.enum(OrderStatus).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isCalendarDate, "Enter a valid date.")
      .optional(),
    customer: z.string().trim().max(150).optional(),
    orderNumber: z.string().trim().pipe(z.uuid()).optional(),
  })
  .strict();

export type OwnerOrderFiltersInput = z.infer<typeof ownerOrderFiltersSchema>;
