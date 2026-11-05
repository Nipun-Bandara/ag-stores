"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useText } from "@/features/i18n/components/locale-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  normalizeMobile,
  personNameSchema,
  optionalAccountEmailSchema,
} from "@/lib/account-identity";
import type { AuthenticatedUser } from "@/types/auth";
import { profileUpdateSchema } from "@/validations/profile";

interface ApiPayload {
  data?: AuthenticatedUser;
  error?: { message?: string };
}
export function ProfileForm({ user }: { user: AuthenticatedUser }) {
  const t = useText();
  const router = useRouter();
  const { updateUser } = useAuth();
  const formik = useFormik({
    initialValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email ?? "",
      preferredLanguage: user.preferredLanguage,
      currentPassword: "",
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      firstName: Yup.string()
        .required(t("Required"))
        .test(
          "name",
          t("Enter a valid name."),
          (value) => !!value && personNameSchema.safeParse(value).success,
        ),
      lastName: Yup.string()
        .required(t("Required"))
        .test(
          "name",
          t("Enter a valid name."),
          (value) => !!value && personNameSchema.safeParse(value).success,
        ),
      phone: Yup.string()
        .required(t("Required"))
        .test(
          "mobile",
          t("Enter a Sri Lankan mobile number such as 0771234567."),
          (value) => !!value && !!normalizeMobile(value),
        ),
      email: Yup.string()
        .trim()
        .test(
          "email",
          t("Enter a valid email address."),
          (value) => optionalAccountEmailSchema.safeParse(value).success,
        ),
      currentPassword: Yup.string()
        .max(128, t("Password must contain at most 128 characters."))
        .test(
          "required-for-mobile",
          t("Enter your current password to change your mobile number."),
          function (value) {
            return normalizeMobile(this.parent.phone) === user.phone || !!value;
          },
        ),
    }),
    onSubmit: async (values, helpers) => {
      const parsed = profileUpdateSchema.safeParse(values);
      if (!parsed.success) {
        helpers.setErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [
              issue.path[0],
              t(issue.message),
            ]),
          ),
        );
        toast.error(t("Profile details are invalid."));
        helpers.setSubmitting(false);
        return;
      }
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }).catch(() => null);
      const payload = response
        ? ((await response.json().catch(() => null)) as ApiPayload | null)
        : {};
      if (
        !response?.ok ||
        !payload?.data ||
        payload.data.id !== user.id ||
        typeof payload.data.phone !== "string" ||
        !payload.data.firstName ||
        !payload.data.lastName
      ) {
        const message = t(
          payload?.error?.message ?? "Unable to update your profile.",
        );
        toast.error(message);
        helpers.setSubmitting(false);
        return;
      }
      updateUser(payload.data);
      helpers.setFieldValue("currentPassword", "", false);
      toast.success(t("Profile updated."));
      router.refresh();
      helpers.setSubmitting(false);
    },
  });
  const field = (
    key: "firstName" | "lastName" | "phone" | "email" | "currentPassword",
    label: string,
    type = "text",
  ) => (
    <div>
      <Label htmlFor={`profile-${key}`}>{t(label)}</Label>
      <Input
        id={`profile-${key}`}
        type={type}
        className="mt-1.5 h-10"
        autoComplete={
          key === "phone"
            ? "tel"
            : key === "email"
              ? "email"
              : key === "currentPassword"
                ? "current-password"
                : key === "firstName"
                  ? "given-name"
                  : "family-name"
        }
        {...formik.getFieldProps(key)}
        aria-invalid={!!(formik.touched[key] && formik.errors[key])}
        aria-describedby={
          formik.touched[key] && formik.errors[key]
            ? `profile-${key}-error`
            : undefined
        }
      />
      {formik.touched[key] && formik.errors[key] ? (
        <p
          id={`profile-${key}-error`}
          className="mt-1 text-xs text-destructive"
        >
          {formik.errors[key]}
        </p>
      ) : null}
    </div>
  );
  return (
    <form className="mt-6 max-w-2xl space-y-5" onSubmit={formik.handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("firstName", "First name")}
        {field("lastName", "Last name")}
      </div>
      {field("phone", "Mobile number", "tel")}
      {field("email", "Email (optional)", "email")}
      <div>
        <Label htmlFor="profile-preferredLanguage">
          {t("Preferred language")}
        </Label>
        <Select
          name="preferredLanguage"
          value={formik.values.preferredLanguage}
          items={[
            { value: "EN", label: t("English") },
            { value: "SI", label: "සිංහල" },
          ]}
          onValueChange={(value) => {
            if (value === "EN" || value === "SI") {
              void formik.setFieldValue("preferredLanguage", value);
            }
          }}
        >
          <SelectTrigger
            id="profile-preferredLanguage"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            onBlur={() =>
              void formik.setFieldTouched("preferredLanguage", true)
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="EN">{t("English")}</SelectItem>
            <SelectItem value="SI">සිංහල</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {normalizeMobile(formik.values.phone) !== user.phone ? (
        <div>
          {field("currentPassword", "Current password", "password")}
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Changing your mobile number requires your current password. No phone verification is performed.",
            )}
          </p>
        </div>
      ) : null}
      <Button variant="success" type="submit" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? t("Saving…") : t("Save profile")}
      </Button>
    </form>
  );
}
