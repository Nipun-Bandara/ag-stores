"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Pencil, CircleCheck, CircleX, Copy } from "lucide-react";
import { toast } from "sonner";
import type { StaffManagement } from "@/services/order-staff.service";
import { normalizeMobile } from "@/lib/account-identity";
import { useText } from "@/features/i18n/components/locale-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputPasswordWithToggle } from "@/components/ui/input-password-with-toggle";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";

type Person = StaffManagement["staff"][number];
export function StaffManager({ data }: { data: StaffManagement }) {
  const t = useText();
  const router = useRouter();
  const [editing, setEditing] = useState<Person>();
  const [credentials, setCredentials] = useState<{
    phone: string;
    password: string;
  }>();
  async function toggle(person: Person) {
    try {
      const response = await fetch(`/api/order-staff/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.message ?? "Unable to save staff account.",
        );
      toast.success(
        t(
          person.status === "ACTIVE"
            ? "Staff account deactivated."
            : "Staff account activated.",
        ),
      );
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        t(
          error instanceof Error
            ? error.message
            : "Unable to save staff account.",
        ),
      );
      return false;
    }
  }
  return (
    <div className="mt-6 space-y-5">
      {credentials ? (
        <Card className="gap-3 p-4 sm:p-5">
          <h2 className="font-semibold">{t("New account sign-in details")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Share these details privately. The staff member can change the password from their profile.",
            )}
          </p>
          <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <Label>
              {t("Mobile number")}
              <Input
                className="mt-1.5 h-10"
                readOnly
                value={credentials.phone}
              />
            </Label>
            <Label>
              {t("Temporary password")}
              <InputPasswordWithToggle
                className="mt-1.5 h-10"
                readOnly
                value={credentials.password}
              />
            </Label>
            <Button
              variant="outline"
              className="h-10"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${credentials.phone}\n${credentials.password}`,
                  );
                  toast.success(t("Sign-in details copied."));
                } catch {
                  toast.error(t("Unable to copy sign-in details."));
                }
              }}
            >
              <Copy />
              {t("Copy sign-in details")}
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => setCredentials(undefined)}
          >
            {t("Dismiss")}
          </Button>
        </Card>
      ) : null}
      {data.shops.length ? (
        <StaffForm
          key={editing?.id ?? "new"}
          data={data}
          person={editing}
          onCancel={() => setEditing(undefined)}
          onSaved={(phone, password) => {
            if (password) setCredentials({ phone, password });
            setEditing(undefined);
            router.refresh();
          }}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {t("A shop must be configured before adding staff.")}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <h2 className="text-lg font-semibold">{t("Order staff accounts")}</h2>
      {data.staff.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.staff.map((person) => (
            <Card
              key={person.id}
              className="flex-row items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <h3 className="break-words font-semibold">
                  {person.firstName} {person.lastName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {person.phone}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {person.assignedShop?.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2">
                <Badge
                  variant={person.status === "ACTIVE" ? "success" : "muted"}
                >
                  {t(person.status === "ACTIVE" ? "Active" : "Inactive")}
                </Badge>
                <div className="flex gap-2">
                  <IconActionButton
                    label={t("Edit staff account")}
                    variant="outline"
                    onClick={() => setEditing(person)}
                  >
                    <Pencil />
                  </IconActionButton>
                  <ConfirmAction
                    title={t(
                      person.status === "ACTIVE"
                        ? "Deactivate staff account?"
                        : "Activate staff account?",
                    )}
                    description={t(
                      "This changes whether this person can sign in to handle orders.",
                    )}
                    confirmLabel={t(
                      person.status === "ACTIVE" ? "Deactivate" : "Activate",
                    )}
                    variant={
                      person.status === "ACTIVE" ? "destructive" : "success"
                    }
                    onConfirm={() => toggle(person)}
                  >
                    <IconActionButton
                      label={t(
                        person.status === "ACTIVE" ? "Deactivate" : "Activate",
                      )}
                      variant={
                        person.status === "ACTIVE" ? "destructive" : "success"
                      }
                      className="text-white [&_svg]:text-white"
                    >
                      {person.status === "ACTIVE" ? (
                        <CircleX />
                      ) : (
                        <CircleCheck />
                      )}
                    </IconActionButton>
                  </ConfirmAction>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("No order staff accounts yet.")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function StaffForm({
  data,
  person,
  onCancel,
  onSaved,
}: {
  data: StaffManagement;
  person?: Person | undefined;
  onCancel: () => void;
  onSaved: (phone: string, password?: string) => void;
}) {
  const t = useText();
  const formik = useFormik({
    initialValues: {
      firstName: person?.firstName ?? "",
      lastName: person?.lastName ?? "",
      phone: person?.phone ?? "",
      email: person?.email ?? "",
      assignedShopId: person?.assignedShopId ?? data.shops[0]?.id ?? "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().trim().required(t("Required")).max(75),
      lastName: Yup.string().trim().required(t("Required")).max(75),
      phone: Yup.string()
        .required(t("Required"))
        .test(
          "mobile",
          t("Enter a Sri Lankan mobile number such as 0771234567."),
          (value) => Boolean(value && normalizeMobile(value)),
        ),
      email: Yup.string().email(t("Enter a valid email address.")),
      assignedShopId: Yup.string().required(t("Required")),
    }),
    onSubmit: async (values, helpers) => {
      try {
        const response = await fetch(
          person ? `/api/order-staff/${person.id}` : "/api/order-staff",
          {
            method: person ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          },
        );
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "Unable to save staff account.",
          );
        toast.success(
          t(person ? "Staff account saved." : "Staff account created."),
        );
        onSaved(payload.data.staff.phone, payload.data.temporaryPassword);
        helpers.resetForm();
      } catch (error) {
        toast.error(
          t(
            error instanceof Error
              ? error.message
              : "Unable to save staff account.",
          ),
        );
      }
    },
  });
  return (
    <Card className="gap-0 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">
        {t(person ? "Edit staff account" : "Create order staff account")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Staff can process orders and print bills. Products, prices, stock adjustments, and shop settings remain restricted.",
        )}
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={formik.handleSubmit}
        noValidate
      >
        {(
          [
            ["firstName", "First name"],
            ["lastName", "Last name"],
            ["phone", "Mobile number"],
            ["email", "Email (optional)"],
          ] as const
        ).map(([name, label]) => (
          <Label key={name} htmlFor={`staff-${name}`} className="block min-w-0">
            {t(label)}
            <Input
              id={`staff-${name}`}
              className="mt-1.5 h-10"
              type={
                name === "email" ? "email" : name === "phone" ? "tel" : "text"
              }
              {...formik.getFieldProps(name)}
              aria-invalid={Boolean(
                formik.touched[name] && formik.errors[name],
              )}
            />
            {formik.touched[name] && formik.errors[name] ? (
              <span className="mt-1 block text-xs text-destructive">
                {formik.errors[name]}
              </span>
            ) : null}
          </Label>
        ))}
        {data.shops.length > 1 ? (
          <Label className="block min-w-0" htmlFor="staff-shop">
            {t("Assigned shop")}
            <Select
              value={formik.values.assignedShopId}
              onValueChange={(value) =>
                void formik.setFieldValue("assignedShopId", value ?? "")
              }
            >
              <SelectTrigger
                id="staff-shop"
                className="mt-1.5 h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue>
                  {(value) =>
                    data.shops.find((shop) => shop.id === value)?.name ??
                    t("Select a shop")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {data.shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>
        ) : null}
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button
            type="submit"
            variant="success"
            className="h-10"
            disabled={formik.isSubmitting}
          >
            {t(person ? "Save changes" : "Create account")}
          </Button>
          {person ? (
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={formik.isSubmitting}
              onClick={onCancel}
            >
              {t("Cancel")}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
