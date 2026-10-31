"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";
import { CircleCheck, CircleX, Pencil } from "lucide-react";
import { toast } from "sonner";

import { FormError, FormField } from "@/features/auth/components/form-fields";
import type {
  DeliveryPersonnelManagementView,
  DeliveryPersonnelView,
} from "@/services/delivery-personnel.service";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiPayload {
  data?:
    | DeliveryPersonnelView
    | {
        personnel: DeliveryPersonnelView;
        temporaryPassword: string;
      };
  error?: { message?: string };
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

function PersonnelForm({
  shops,
  person,
  onSaved,
  onCancel,
  onTemporaryPassword,
}: {
  shops: DeliveryPersonnelManagementView["shops"];
  person?: DeliveryPersonnelView;
  onSaved: (person: DeliveryPersonnelView) => void;
  onCancel?: () => void;
  onTemporaryPassword: (password: string) => void;
}) {
  const t = useText();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [assignedShopId, setAssignedShopId] = useState(
    person?.assignedShopId ?? shops[0]?.id ?? "",
  );
  const [status, setStatus] = useState("ACTIVE");
  const suffix = person?.id ?? "new";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(
      person
        ? `/api/delivery-personnel/${person.id}`
        : "/api/delivery-personnel",
      {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          assignedShopId,
          ...(!person ? { status } : {}),
        }),
      },
    ).catch(() => null);

    const payload = response ? await readPayload(response) : {};
    if (!response?.ok || !payload.data) {
      const message = t(
        payload.error?.message ?? "Unable to save delivery personnel.",
      );
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }

    if (payload.data && "personnel" in payload.data) {
      toast.success(t("Delivery account created successfully."));
      onSaved(payload.data.personnel);
      onTemporaryPassword(payload.data.temporaryPassword);
      formElement.reset();
      setAssignedShopId(shops[0]?.id ?? "");
      setStatus("ACTIVE");
    } else if (payload.data) {
      toast.success(t("Delivery personnel details saved."));
      onSaved(payload.data);
    }
    setPending(false);
  }

  return (
    <Card className="gap-0 p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold">
          {person ? `Edit ${person.name}` : t("Create delivery account")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField
            id={`delivery-name-${suffix}`}
            name="name"
            label="Name"
            defaultValue={person?.name ?? ""}
            maxLength={150}
            required
          />
          <FormField
            id={`delivery-email-${suffix}`}
            name="email"
            label="Email"
            type="email"
            defaultValue={person?.email ?? ""}
            maxLength={320}
            required
          />
          <FormField
            id={`delivery-phone-${suffix}`}
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={person?.phone ?? ""}
            placeholder="+94771234567"
            required
          />
        </div>
        <div
          className={`grid gap-4 md:grid-cols-2 xl:items-end ${
            person ? "xl:grid-cols-2" : "xl:grid-cols-3"
          }`}
        >
          <div className="min-w-0">
            <Label
              htmlFor={`delivery-shop-${suffix}`}
              className="block text-sm font-medium"
            >
              <Text value="Assigned shop" />
            </Label>
            <Select
              name="assignedShopId"
              value={assignedShopId}
              onValueChange={(value) => setAssignedShopId(value ?? "")}
              required
            >
              <SelectTrigger
                id={`delivery-shop-${suffix}`}
                className="mt-1.5 h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue>
                  {(value) =>
                    shops.find((shop) => shop.id === value)?.name ??
                    t("Select a shop")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-0">
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!person ? (
            <div className="min-w-0">
              <Label
                htmlFor="delivery-status-new"
                className="block text-sm font-medium"
              >
                <Text value="Status" />
              </Label>
              <Select
                name="status"
                value={status}
                onValueChange={(value) => setStatus(value ?? "ACTIVE")}
                required
              >
                <SelectTrigger
                  id="delivery-status-new"
                  className="mt-1.5 h-10 w-full data-[size=default]:h-10"
                >
                  <SelectValue>
                    {(value) => t(value === "INACTIVE" ? "Inactive" : "Active")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="min-w-0">
                  <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
                  <SelectItem value="INACTIVE">{t("Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
            <Button
              variant="success"
              type="submit"
              disabled={pending || shops.length === 0}
              className="h-10"
            >
              {pending
                ? t("Saving…")
                : person
                  ? t("Save delivery person")
                  : t("Create delivery account")}
            </Button>
            {onCancel ? (
              <Button
                variant="outline"
                type="button"
                className="h-10"
                onClick={onCancel}
              >
                <Text value={"Cancel "} />
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <FormError>{error}</FormError> : null}
      </form>
    </Card>
  );
}

export function DeliveryPersonnelManager({
  initialData,
}: {
  initialData: DeliveryPersonnelManagementView;
}) {
  const t = useText();
  const [personnel, setPersonnel] = useState(initialData.personnel);
  const [editingId, setEditingId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [temporaryPassword, setTemporaryPassword] = useState<string>();
  const editingPerson = personnel.find(({ id }) => id === editingId);

  function savePerson(saved: DeliveryPersonnelView) {
    setPersonnel((current) => {
      const exists = current.some(({ id }) => id === saved.id);
      return exists
        ? current.map((person) => (person.id === saved.id ? saved : person))
        : [...current, saved];
    });
    setEditingId(undefined);
  }

  async function changeStatus(person: DeliveryPersonnelView) {
    setError(undefined);
    setPendingId(person.id);
    const status = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(
      `/api/delivery-personnel/${person.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ).catch(() => null);

    const payload = response ? await readPayload(response) : {};
    if (!response?.ok || !payload.data || "personnel" in payload.data) {
      const message = t(
        payload.error?.message ?? "Unable to update account status.",
      );
      setError(message);
      toast.error(message);
    } else {
      savePerson(payload.data);
      toast.success(
        t(
          payload.data.status === "ACTIVE"
            ? "{name} was activated."
            : "{name} was deactivated.",
          { name: payload.data.name },
        ),
      );
    }
    setPendingId(undefined);
  }

  return (
    <div className="mt-8 space-y-8">
      <div>
        {initialData.shops.length ? (
          <PersonnelForm
            key={editingPerson?.id ?? "new"}
            shops={initialData.shops}
            {...(editingPerson ? { person: editingPerson } : {})}
            {...(editingPerson
              ? { onCancel: () => setEditingId(undefined) }
              : {})}
            onSaved={savePerson}
            onTemporaryPassword={setTemporaryPassword}
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <Text
                  value={
                    "A shop is required before creating delivery accounts. "
                  }
                />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
        {temporaryPassword ? (
          <Card
            as="section"
            className="mt-4 max-w-xl gap-0 bg-amber-50 p-4"
            aria-label={t("Temporary password")}
          >
            <h3 className="font-semibold">
              <Text value={t("Temporary password")} />
            </h3>
            <p className="mt-1 text-sm text-amber-900">
              <Text
                value={
                  "Share this securely. It is shown only for this creation response. "
                }
              />
            </p>
            <code className="mt-3 block break-all rounded bg-background p-3 text-sm">
              {temporaryPassword}
            </code>
          </Card>
        ) : null}
      </div>

      <section aria-labelledby="delivery-personnel-list-heading">
        <h2
          id="delivery-personnel-list-heading"
          className="text-lg font-semibold"
        >
          <Text value={"Delivery personnel "} />
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {personnel.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {personnel.map((person) => (
              <Card
                as="article"
                key={person.id}
                data-testid="delivery-person-card"
                className="gap-0 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">{person.name}</h3>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {person.email}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {person.phone}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {person.assignedShopName ?? t("Unassigned")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-2 rounded-lg bg-muted/40 px-2 py-2">
                    <Badge variant="secondary">
                      {person.status === "ACTIVE" ? t("Active") : t("Inactive")}
                    </Badge>
                    <div className="flex items-center justify-center gap-2">
                      <IconActionButton
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        label={`${t("Edit")} ${person.name}`}
                        onClick={() => setEditingId(person.id)}
                      >
                        <Pencil aria-hidden="true" />
                      </IconActionButton>
                      <IconActionButton
                        variant={
                          person.status === "ACTIVE" ? "destructive" : "success"
                        }
                        className="text-white"
                        size="icon-sm"
                        type="button"
                        label={`${t(person.status === "ACTIVE" ? "Deactivate" : "Activate")} ${person.name}`}
                        disabled={pendingId === person.id}
                        onClick={() => changeStatus(person)}
                      >
                        {person.status === "ACTIVE" ? (
                          <CircleX
                            aria-hidden="true"
                            className="stroke-white"
                          />
                        ) : (
                          <CircleCheck
                            aria-hidden="true"
                            className="stroke-white"
                          />
                        )}
                      </IconActionButton>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>
                <Text
                  value={"No delivery personnel have been assigned yet. "}
                />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  );
}
