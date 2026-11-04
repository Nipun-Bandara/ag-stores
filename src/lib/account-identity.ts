import { z } from "zod";

/** Sri Lankan mobile numbers only; formatting characters never become identity. */
export function normalizeMobile(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (/^07\d{8}$/.test(compact)) return `+94${compact.slice(1)}`;
  return /^\+947\d{8}$/.test(compact) ? compact : null;
}

export const mobileSchema = z.string().transform((value, context) => {
  const normalized = normalizeMobile(value);
  if (!normalized) {
    context.addIssue({
      code: "custom",
      message: "Enter a Sri Lankan mobile number such as 0771234567.",
    });
    return z.NEVER;
  }
  return normalized;
});

export const personNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(75)
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}\u200C\u200D'’.-]*$/u,
    "Enter a valid name.",
  );

export const optionalAccountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => !value || z.email().max(320).safeParse(value).success, {
    message: "Enter a valid email address.",
  })
  .nullish()
  .transform((value) => value || null);
