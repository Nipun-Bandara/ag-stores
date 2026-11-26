import { getIn, setIn, type FormikErrors } from "formik";
import { z } from "zod";

import {
  normalizeMobile,
  optionalAccountEmailSchema,
  personNameSchema,
} from "@/lib/account-identity";

type Translate = (value: string) => string;

/**
 * Adapts a Zod schema to Formik's `validate` option. Only the first issue per
 * field is shown, matching how Formik displays one message per input. Issues
 * on the form root are ignored, so attach object-level refinements to a path.
 */
export function formikValidator<Values>(schema: z.ZodType) {
  return (values: Values): FormikErrors<Values> => {
    const result = schema.safeParse(values);
    if (result.success) return {};
    let errors: FormikErrors<Values> = {};
    for (const issue of result.error.issues) {
      if (issue.path.length === 0) continue;
      const path = issue.path.map(String).join(".");
      if (getIn(errors, path) === undefined) {
        errors = setIn(errors, path, issue.message);
      }
    }
    return errors;
  };
}

/**
 * Zod skips object-level refinements while any field is invalid. Forms check
 * each input independently, so cross-field rules pass this to always run.
 */
export const alwaysRun = { when: () => true } as const;

/** A required text input (whitespace-only counts as empty). */
export function requiredText(t: Translate) {
  return z.string().refine((value) => value.trim().length > 0, t("Required"));
}

export function personNameField(t: Translate) {
  return requiredText(t).refine(
    (value) => !value.trim() || personNameSchema.safeParse(value).success,
    t("Enter a valid name."),
  );
}

export function mobileField(t: Translate) {
  return requiredText(t).refine(
    (value) => !value.trim() || normalizeMobile(value) !== null,
    t("Enter a Sri Lankan mobile number such as 0771234567."),
  );
}

export function optionalEmailField(t: Translate) {
  return z
    .string()
    .refine(
      (value) => optionalAccountEmailSchema.safeParse(value).success,
      t("Enter a valid email address."),
    );
}

export function passwordField(t: Translate) {
  return requiredText(t).refine(
    (value) => value.length <= 128,
    t("Password must contain at most 128 characters."),
  );
}
