import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert } from "@/components/ui/alert";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function FormField({ label, hint, id, ...props }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="block text-sm font-medium">
        {label}
      </Label>
      <Input id={id} className="mt-1.5 h-10 w-full" {...props} />
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
        {label}
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
      {children}
    </Alert>
  );
}
