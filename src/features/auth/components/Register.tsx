"use client";

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

interface RegisterProps {
  returnTo: string;
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin, returnTo }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: "",
      name: "",
      password: "",
      preferredLanguage: "EN" as "EN" | "SI",
    },
    validate: (values) => {
      const result = registrationSchema.safeParse(values);
      if (result.success) return {};
      return Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
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
        toast.success("Account created successfully!");
      } catch (error: unknown) {
        setServerError(
          describeApiError(
            error,
            "An unexpected error occurred. Please try again.",
          ),
        );
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center lg:text-left space-y-2">
        <CardTitle className="text-3xl lg:text-4xl font-bold font-clash-display">
          Create Account
        </CardTitle>
        <CardDescription>
          Create your AG Stores customer account. Staff accounts are created by
          an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="mt-2 space-y-5">
          {serverError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {serverError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-medium mb-1.5"
              >
                Email
              </label>
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
              <label
                htmlFor="register-name"
                className="block text-sm font-medium mb-1.5"
              >
                Name
              </label>
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
                  placeholder="Enter name"
                />
              </div>
              {formik.touched.name && formik.errors.name ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.name}
                </div>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-medium mb-1.5"
              >
                Password
              </label>
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
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password ? (
                <div className="text-destructive text-xs mt-1">
                  {formik.errors.password}
                </div>
              ) : null}
            </div>
            <div>
              <label
                id="register-language-label"
                className="block text-sm font-medium mb-1.5"
              >
                Preferred language
              </label>
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
                    {(value) => (value === "SI" ? "සිංහල" : "English")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English</SelectItem>
                  <SelectItem value="SI">සිංහල</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formik.isSubmitting ? "Creating Account..." : "Register"}
          </button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-center mt-4 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
