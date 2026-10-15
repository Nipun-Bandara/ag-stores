"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";
import { useFormik } from "formik";
import { registrationSchema } from "@/validations/auth";
import {
  Mail,
  Lock,
  User,
  Eye as EyeIcon,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { describeApiError } from "@/utils/apiError";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RegisterProps {
  returnTo: string;
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin, returnTo }: RegisterProps) {
  const locale = useLocale();
  const t = useText();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: "",
      name: "",
      password: "",
      preferredLanguage: locale === "si" ? ("SI" as const) : ("EN" as const),
    },
    validate: (values) => {
      const result = registrationSchema.safeParse(values);
      if (result.success) return {};
      return Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], t(issue.message)]),
      );
    },
    onSubmit: async (values) => {
      setServerError(null);
      try {
        await register(
          {
            email: values.email || undefined,
            phone: undefined,
            name: values.name,
            password: values.password,
            preferredLanguage: values.preferredLanguage,
          },
          returnTo,
        );
        toast.success(t("Account created successfully!"));
      } catch (error: unknown) {
        setServerError(
          t(
            describeApiError(
              error,
              t("An unexpected error occurred. Please try again."),
            ),
          ),
        );
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center lg:text-left space-y-2">
        <CardTitle className="text-3xl lg:text-4xl font-bold font-clash-display">
          <Text value={"Create Account "} />
        </CardTitle>
        <CardDescription>
          <Text
            value={
              "Create your AG Stores customer account. Staff accounts are created by an administrator. "
            }
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="mt-2 space-y-5">
          {serverError && (
            <Alert
              variant="destructive"
              role="alert"
              className="flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {serverError}
            </Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="register-email"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Email "} />
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  type="email"
                  id="register-email"
                  {...formik.getFieldProps("email")}
                  className="pl-10 h-10"
                  aria-invalid={!!(formik.touched.email && formik.errors.email)}
                  placeholder="you@example.com"
                />
              </div>
              {formik.touched.email && formik.errors.email ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.email}
                </div>
              ) : null}
            </div>

            <div>
              <Label
                htmlFor="register-name"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Name "} />
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  id="register-name"
                  {...formik.getFieldProps("name")}
                  className="pl-10 h-10"
                  aria-invalid={!!(formik.touched.name && formik.errors.name)}
                  placeholder={t("Enter name")}
                />
              </div>
              {formik.touched.name && formik.errors.name ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.name}
                </div>
              ) : null}
            </div>
            <div>
              <Label
                htmlFor="register-password"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Password "} />
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  id="register-password"
                  {...formik.getFieldProps("password")}
                  className="pl-10 pr-12 h-10"
                  aria-invalid={
                    !!(formik.touched.password && formik.errors.password)
                  }
                  placeholder={t("Enter your password")}
                />
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={
                    showPassword ? t("Hide password") : t("Show password")
                  }
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {formik.touched.password && formik.errors.password ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.password}
                </div>
              ) : null}
            </div>
            <div>
              <Label
                id="register-language-label"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Preferred language "} />
              </Label>
              <Select
                value={formik.values.preferredLanguage}
                onValueChange={(value) =>
                  void formik.setFieldValue("preferredLanguage", value)
                }
              >
                <SelectTrigger
                  aria-labelledby="register-language-label"
                  className="w-full"
                >
                  <SelectValue>
                    {(value) => (value === "SI" ? t("සිංහල") : t("English"))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">
                    <Text value={t("English")} />
                  </SelectItem>
                  <SelectItem value="SI">සිංහල</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
      <CardFooter className="flex justify-center">
        <div className="text-center mt-4 text-sm text-muted-foreground">
          <Button variant="ghost" type="button" onClick={onSwitchToLogin}>
            <Text value={"Already have an account? Sign in "} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
