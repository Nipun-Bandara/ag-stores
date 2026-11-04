"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useFormik } from "formik";
import * as Yup from "yup";
import { Phone, Lock } from "lucide-react";
import { normalizeMobile } from "@/lib/account-identity";
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
import { Input } from "@/components/ui/input";
import { describeApiError } from "@/utils/apiError";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputPasswordWithToggle } from "@/components/ui/input-password-with-toggle";

interface LoginProps {
  returnTo: string;
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup, returnTo }: LoginProps) {
  const t = useText();

  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      identifier: "",
      password: "",
    },
    validationSchema: Yup.object({
      identifier: Yup.string()
        .required(t("Required"))
        .test(
          "mobile",
          t("Enter a Sri Lankan mobile number such as 0771234567."),
          (value) => !!value && !!normalizeMobile(value),
        ),
      password: Yup.string()
        .max(128, t("Password must contain at most 128 characters."))
        .required(t("Required")),
    }),
    onSubmit: async (values) => {
      try {
        await login(values, returnTo);
        toast.success(t("Logged in successfully!"));
      } catch (error: unknown) {
        const message = t(
          describeApiError(
            error,
            t("An unexpected error occurred. Please try again."),
          ),
        );
        toast.error(message);
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center lg:text-left space-y-2">
        <CardTitle className="text-3xl lg:text-4xl font-bold font-clash-display">
          <Text value={"Welcome back "} />
        </CardTitle>
        <CardDescription>
          <Text value={t("Please enter your details to sign in.")} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="login-identifier"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Mobile number "} />
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Phone className="h-5 w-5" />
                </div>
                <Input
                  type="tel"
                  autoComplete="username"
                  id="login-identifier"
                  {...formik.getFieldProps("identifier")}
                  className="pl-10 h-10"
                  aria-invalid={
                    !!(formik.touched.identifier && formik.errors.identifier)
                  }
                  aria-describedby={
                    formik.touched.identifier && formik.errors.identifier
                      ? "login-identifier-error"
                      : undefined
                  }
                  placeholder="0771234567"
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier ? (
                <div
                  id="login-identifier-error"
                  className="text-destructive text-xs mt-1"
                >
                  {formik.errors.identifier}
                </div>
              ) : null}
            </div>

            <div>
              <InputPasswordWithToggle
                id="login-password"
                label={t("Password")}
                startIcon={<Lock aria-hidden="true" className="size-5" />}
                autoComplete="current-password"
                {...formik.getFieldProps("password")}
                aria-invalid={
                  !!(formik.touched.password && formik.errors.password)
                }
                aria-describedby={
                  formik.touched.password && formik.errors.password
                    ? "login-password-error"
                    : undefined
                }
                placeholder={t("Enter your password")}
                showPasswordLabel={t("Show password")}
                hidePasswordLabel={t("Hide password")}
              />
              {formik.touched.password && formik.errors.password ? (
                <div
                  id="login-password-error"
                  className="text-destructive text-xs mt-1"
                >
                  {formik.errors.password}
                </div>
              ) : null}
            </div>
          </div>

          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full flex justify-center hover:scale-[1.02] active:scale-[0.98]"
          >
            {formik.isSubmitting ? t("Signing in...") : t("Sign in")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <Text value={t("Don't have an account?")} />{" "}
          <Button variant="ghost" type="button" onClick={onSwitchToSignup}>
            <Text value={"Sign up "} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
