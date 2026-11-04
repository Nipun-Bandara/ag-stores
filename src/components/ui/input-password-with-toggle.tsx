"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type InputPasswordWithToggleProps = Omit<
  ComponentProps<typeof InputGroupInput>,
  "type"
> & {
  label?: ReactNode;
  startIcon?: ReactNode;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  containerClassName?: string;
};

function InputPasswordWithToggle({
  id,
  label = "Password",
  startIcon,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  placeholder = "Enter your password",
  containerClassName,
  disabled,
  ...props
}: InputPasswordWithToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field className={cn("w-full gap-1.5", containerClassName)}>
      <FieldLabel htmlFor={inputId} className="text-sm font-medium">
        {label}
      </FieldLabel>
      <InputGroup className="h-10 bg-background">
        {startIcon ? (
          <InputGroupAddon align="inline-start" className="[&>svg]:size-5">
            {startIcon}
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          {...props}
          id={inputId}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={showPassword}
            aria-controls={inputId}
            onClick={() => setShowPassword((current) => !current)}
            disabled={disabled}
            size="icon-xs"
          >
            {showPassword ? (
              <EyeOffIcon aria-hidden="true" />
            ) : (
              <EyeIcon aria-hidden="true" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

export { InputPasswordWithToggle };
export default InputPasswordWithToggle;
