"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Mail, Lock, Eye as EyeIcon, EyeOff, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginProps {
  returnTo: string;
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup, returnTo }: LoginProps) {
  const t = useText();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      identifier: "",
      password: "",
    },
    validationSchema: Yup.object({
      identifier: Yup.string()
        .min(3, t("Enter your email address or phone number"))
        .required(t("Required")),
      password: Yup.string().required(t("Required")),
    }),
    onSubmit: async (values) => {
      setServerError(null);
      try {
        await login(values, returnTo);
        toast.success(t("Logged in successfully!"));
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
          <Text value={"Welcome back "} />
        </CardTitle>
        <CardDescription>
          <Text value={t("Please enter your details to sign in.")} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="space-y-5">
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
                htmlFor="login-identifier"
                className="block text-sm font-medium mb-1.5"
              >
                <Text value={"Email or phone "} />
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  autoComplete="username"
                  id="login-identifier"
                  {...formik.getFieldProps("identifier")}
                  className="pl-10 h-10"
                  aria-invalid={
                    !!(formik.touched.identifier && formik.errors.identifier)
                  }
                  placeholder={t("Email or phone")}
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.identifier}
                </div>
              ) : null}
            </div>

            <div>
              <Label
                htmlFor="login-password"
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
                  id="login-password"
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
                  tabIndex={-1}
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
          </div>

          <div className="flex items-center justify-between text-sm">
            <Label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox className="w-4 h-4" />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                <Text value={"Remember me "} />
              </span>
            </Label>
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/forgot-password")}
            >
              <Text value={"Forgot password? "} />
            </Button>
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
