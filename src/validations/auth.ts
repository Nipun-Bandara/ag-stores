import { z } from "zod";

const optionalEmailSchema = z
  .union([
    z.string().trim().toLowerCase().pipe(z.email().max(320)),
    z.literal(""),
  ])
  .optional()
  .transform((value) => value || undefined);

const optionalPhoneSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Use an international number such as +94771234567.",
      ),
    z.literal(""),
  ])
  .optional()
  .transform((value) => value || undefined);

export const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/\d/, "Password must contain a number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character.");

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    password: passwordSchema,
    preferredLanguage: z.enum(["EN", "SI"]),
  })
  .superRefine(({ email, phone }, context) => {
    if (!email && !phone) {
      const message = "Provide an email address or phone number.";
      context.addIssue({ code: "custom", path: ["email"], message });
      context.addIssue({ code: "custom", path: ["phone"], message });
    }
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(128),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
