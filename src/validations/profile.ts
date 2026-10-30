import { z } from "zod";

import { passwordSchema } from "@/validations/auth";

const editablePhoneSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Use an international number such as +94771234567.",
      ),
    z.literal(""),
    z.null(),
  ])
  .transform((value) => value || null);

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    phone: editablePhoneSchema,
    preferredLanguage: z.enum(["EN", "SI"]),
  })
  .strict();

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .strict()
  .superRefine(({ currentPassword, newPassword, confirmPassword }, context) => {
    if (newPassword !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
    if (newPassword === currentPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from the current password.",
      });
    }
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
