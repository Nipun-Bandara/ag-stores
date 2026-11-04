import { z } from "zod";
import {
  mobileSchema,
  optionalAccountEmailSchema,
  personNameSchema,
} from "@/lib/account-identity";

export const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/\d/, "Password must contain a number.");

export const registrationSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    phone: mobileSchema,
    email: optionalAccountEmailSchema,
    password: passwordSchema,
    preferredLanguage: z.enum(["EN", "SI"]),
  })
  .strict();

export const loginSchema = z
  .object({
    identifier: mobileSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
