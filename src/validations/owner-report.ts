import { z } from "zod";

import { OrderStatus } from "@/generated/prisma/client";

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.");

export const ownerReportFiltersSchema = z
  .object({
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    status: z.enum(OrderStatus).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.from) !== Boolean(value.to)) {
      context.addIssue({
        code: "custom",
        message: "Both start and end dates are required.",
        path: value.from ? ["to"] : ["from"],
      });
      return;
    }
    if (!value.from || !value.to) return;
    const from = new Date(`${value.from}T00:00:00.000Z`);
    const to = new Date(`${value.to}T00:00:00.000Z`);
    const rangeDays = (to.getTime() - from.getTime()) / 86_400_000;
    if (rangeDays < 0) {
      context.addIssue({
        code: "custom",
        message: "End date must be on or after start date.",
        path: ["to"],
      });
    } else if (rangeDays > 365) {
      context.addIssue({
        code: "custom",
        message: "Date range cannot exceed 366 days.",
        path: ["to"],
      });
    }
  });

export type OwnerReportFiltersInput = z.infer<typeof ownerReportFiltersSchema>;
