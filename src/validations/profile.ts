import { z } from "zod";
import {
  mobileSchema,
  optionalAccountEmailSchema,
  personNameSchema,
} from "@/lib/account-identity";
import { passwordSchema } from "@/validations/auth";

export const profileUpdateSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    phone: mobileSchema,
    email: optionalAccountEmailSchema,
    preferredLanguage: z.enum(["EN", "SI"]),
    currentPassword: z.string().max(128).optional(),
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
