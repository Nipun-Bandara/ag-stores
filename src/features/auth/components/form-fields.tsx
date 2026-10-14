import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert } from "@/components/ui/alert";
import { Text } from "@/features/i18n/components/text";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function FormField({ label, hint, id, ...props }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="block text-sm font-medium">
        <Text value={label} />
      </Label>
      <Input id={id} className="mt-1.5 h-10 w-full" {...props} />
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <Text value={hint} />
        </p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({
  label,
  id,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="block text-sm font-medium">
        <Text value={label} />
      </Label>
      <NativeSelect id={id} className="mt-1.5 h-10 w-full" {...props}>
        {children}
      </NativeSelect>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" role="alert" className="">
      {typeof children === "string" ? <Text value={children} /> : children}
    </Alert>
  );
}
