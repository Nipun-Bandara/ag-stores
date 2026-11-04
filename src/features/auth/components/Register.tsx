"use client";
import { Lock, Mail, Phone, UserRound } from "lucide-react";
import { InputPasswordWithToggle } from "@/components/ui/input-password-with-toggle";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { registrationSchema } from "@/validations/auth";
import {
  normalizeMobile,
  personNameSchema,
  optionalAccountEmailSchema,
} from "@/lib/account-identity";
import { describeApiError } from "@/utils/apiError";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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

interface RegisterProps {
  returnTo: string;
  onSwitchToLogin: () => void;
}
export default function Register({ onSwitchToLogin, returnTo }: RegisterProps) {
  const locale = useLocale();
  const t = useText();
  const { register } = useAuth();
  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      preferredLanguage: locale === "si" ? "SI" : "EN",
    },
    validationSchema: Yup.object({
      firstName: Yup.string()
        .required(t("Required"))
        .test(
          "person-name",
          t("Enter a valid name."),
          (value) => !!value && personNameSchema.safeParse(value).success,
        ),
      lastName: Yup.string()
        .required(t("Required"))
        .test(
          "person-name",
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
      password: Yup.string()
        .max(128, t("Password must contain at most 128 characters."))
        .required(t("Required"))
        .test(
          "strong-password",
          t("Use 8+ characters with uppercase, lowercase, and a number."),
          (value) =>
            !!value &&
            registrationSchema.shape.password.safeParse(value).success,
        ),
    }),
    onSubmit: async (values) => {
      try {
        const payload = registrationSchema.parse(values);
        await register(payload, returnTo);
        toast.success(t("Account created successfully!"));
      } catch (error) {
        const message = t(
          describeApiError(error, "Unable to create your account."),
        );
        toast.error(message);
      }
    },
  });
  const field = (
    key: "firstName" | "lastName" | "phone" | "email",
    label: string,
    type = "text",
    placeholder?: string,
  ) => {
    const Icon = key === "phone" ? Phone : key === "email" ? Mail : UserRound;
    return (
      <div>
        <Label
          htmlFor={`register-${key}`}
          className="mb-1.5 block text-sm font-medium"
        >
          {t(label)}
        </Label>
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground transition-colors group-focus-within:text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </div>
          <Input
            id={`register-${key}`}
            type={type}
            autoComplete={
              key === "phone"
                ? "tel"
                : key === "email"
                  ? "email"
                  : key === "firstName"
                    ? "given-name"
                    : "family-name"
            }
            placeholder={placeholder}
            className="h-10 pl-10"
            {...formik.getFieldProps(key)}
            aria-invalid={!!(formik.touched[key] && formik.errors[key])}
            aria-describedby={
              formik.touched[key] && formik.errors[key]
                ? `register-${key}-error`
                : undefined
            }
          />
        </div>
        {formik.touched[key] && formik.errors[key] ? (
          <p
            id={`register-${key}-error`}
            className="mt-1 text-xs text-destructive"
          >
            {formik.errors[key]}
          </p>
        ) : null}
      </div>
    );
  };
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center lg:text-left">
        <CardTitle className="font-clash-display text-3xl font-bold lg:text-4xl">
          <Text value="Create Account" />
        </CardTitle>
        <CardDescription>
          <Text value="Create your AG Stores customer account. Staff accounts are created by an administrator." />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", "First name")}
            {field("lastName", "Last name")}
          </div>
          {field("phone", "Mobile number", "tel", "0771234567")}
          {field("email", "Email (optional)", "email", "you@example.com")}
          <div>
            <InputPasswordWithToggle
              id="register-password"
              label={t("Password")}
              startIcon={<Lock aria-hidden="true" className="size-5" />}
              autoComplete="new-password"
              {...formik.getFieldProps("password")}
              aria-invalid={
                !!(formik.touched.password && formik.errors.password)
              }
              aria-describedby={
                formik.touched.password && formik.errors.password
                  ? "register-password-error"
                  : undefined
              }
              placeholder={t("Enter your password")}
              showPasswordLabel={t("Show password")}
              hidePasswordLabel={t("Hide password")}
            />
            {formik.touched.password && formik.errors.password ? (
              <p
                id="register-password-error"
                className="mt-1 text-xs text-destructive"
              >
                {formik.errors.password}
              </p>
            ) : null}
          </div>
          <div>
            <Label
              htmlFor="register-language"
              className="mb-1.5 block text-sm font-medium"
            >
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
                if (value)
                  void formik.setFieldValue("preferredLanguage", value);
              }}
            >
              <SelectTrigger
                id="register-language"
                className="h-10 w-full data-[size=default]:h-10"
                onBlur={() => {
                  void formik.setFieldTouched("preferredLanguage", true);
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-0">
                <SelectItem value="EN">{t("English")}</SelectItem>
                <SelectItem value="SI">සිංහල</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full flex justify-center hover:scale-[1.02] active:scale-[0.98]"
          >
            {formik.isSubmitting ? t("Creating Account...") : t("Register")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="ghost" type="button" onClick={onSwitchToLogin}>
          <Text value="Already have an account? Sign in" />
        </Button>
      </CardFooter>
    </Card>
  );
}
