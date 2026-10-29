"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";
import { CircleCheck, MapPin, Pencil, Trash2 } from "lucide-react";

import { FormError, FormField } from "@/features/auth/components/form-fields";
import type { CustomerAddressView } from "@/services/customer-address.service";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  LocationPicker,
  parsePickedLocation,
} from "@/features/maps/components/location-picker";

interface ApiPayload {
  data?: CustomerAddressView;
  error?: { message?: string };
}

interface AddressFormProps {
  address?: CustomerAddressView;
  onCancel?: () => void;
  onSaved: (address: CustomerAddressView) => void;
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

function AddressForm({ address, onCancel, onSaved }: AddressFormProps) {
  const t = useText();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [location, setLocation] = useState(() =>
    parsePickedLocation(address?.latitude, address?.longitude),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!location) {
      setError(t("Choose a location before saving."));
      return;
    }
    setPending(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(
      address
        ? `/api/account/addresses/${address.id}`
        : "/api/account/addresses",
      {
        method: address ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.get("label"),
          address: form.get("address"),
          latitude: form.get("latitude"),
          longitude: form.get("longitude"),
          isDefault:
            Boolean(address?.isDefault) || form.get("isDefault") === "on",
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(t(payload.error?.message ?? "Unable to save this address."));
      setPending(false);
      return;
    }

    const payload = await readPayload(response);
    if (payload.data) onSaved(payload.data);
    if (!address) {
      formElement.reset();
      setLocation(null);
    }
    setPending(false);
  }

  return (
    <Card className="gap-0 p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold">
          {address ? (
            <>
              <Text value="Edit" /> {address.label}
            </>
          ) : (
            t("Add an address")
          )}
        </h2>
        <FormField
          id={address ? `label-${address.id}` : "label"}
          name="label"
          label="Label"
          placeholder={t("Home, Office, or Other")}
          defaultValue={address?.label ?? ""}
          maxLength={80}
          required
        />
        <FormField
          id={address ? `address-${address.id}` : "address"}
          name="address"
          label="Address"
          defaultValue={address?.address ?? ""}
          maxLength={1000}
          required
        />
        <LocationPicker value={location} onChange={setLocation} />
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            name="isDefault"
            defaultChecked={address?.isDefault ?? false}
            disabled={address?.isDefault ?? false}
          />
          <Text value={"Use as default address "} />
        </Label>
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="success"
            type="submit"
            disabled={pending}
            className="h-10"
          >
            {pending
              ? t("Saving…")
              : address
                ? t("Save changes")
                : t("Add address")}
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
      </form>
    </Card>
  );
}

export function AddressManager({
  initialAddresses,
}: {
  initialAddresses: CustomerAddressView[];
}) {
  const t = useText();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const editingAddress = addresses.find(({ id }) => id === editingId);

  function saveAddress(saved: CustomerAddressView) {
    setAddresses((current) => {
      const exists = current.some(({ id }) => id === saved.id);
      const next = exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
      return saved.isDefault
        ? next.map((item) => ({
            ...item,
            isDefault: item.id === saved.id,
          }))
        : next;
    });
    setEditingId(undefined);
  }

  async function setDefault(addressId: string) {
    setError(undefined);
    setPendingId(addressId);
    const response = await fetch(
      `/api/account/addresses/${addressId}/default`,
      { method: "POST" },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(
        t(payload.error?.message ?? "Unable to set the default address."),
      );
    } else {
      setAddresses((current) =>
        current.map((item) => ({
          ...item,
          isDefault: item.id === addressId,
        })),
      );
    }
    setPendingId(undefined);
  }

  async function deleteAddress(addressId: string) {
    setError(undefined);
    setPendingId(addressId);
    const response = await fetch(`/api/account/addresses/${addressId}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(t(payload.error?.message ?? "Unable to delete this address."));
    } else {
      const deletedWasDefault = addresses.some(
        (item) => item.id === addressId && item.isDefault,
      );
      setAddresses((current) => {
        const next = current.filter(({ id }) => id !== addressId);
        if (deletedWasDefault && next.length > 0) {
          const replacement = [...next].sort((left, right) =>
            left.label.localeCompare(right.label),
          )[0];
          return next.map((item) => ({
            ...item,
            isDefault: item.id === replacement?.id,
          }));
        }
        return next;
      });
    }
    setPendingId(undefined);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AddressForm
        key={editingAddress?.id ?? "new"}
        {...(editingAddress ? { address: editingAddress } : {})}
        {...(editingAddress ? { onCancel: () => setEditingId(undefined) } : {})}
        onSaved={saveAddress}
      />
      <section aria-labelledby="saved-addresses-heading">
        <h2 id="saved-addresses-heading" className="text-lg font-semibold">
          <Text value={"Saved addresses "} />
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {addresses.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>
                <Text value={"You have no saved delivery addresses. "} />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-4 space-y-4">
            {addresses.map((item) => (
              <Card as="article" key={item.id} className="gap-0 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h3 className="min-w-0 break-words font-semibold">
                    {item.label}
                  </h3>
                  {item.isDefault ? (
                    <Badge variant="secondary">
                      <Text value={t("Default")} />
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {item.address}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {t("Location pinned")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                  <IconActionButton
                    variant="ghost"
                    type="button"
                    label={`${t("Edit")} ${item.label}`}
                    onClick={() => setEditingId(item.id)}
                  >
                    <Pencil aria-hidden="true" />
                  </IconActionButton>
                  {!item.isDefault ? (
                    <IconActionButton
                      variant="success"
                      type="button"
                      label={t("Make {name} default", { name: item.label })}
                      disabled={pendingId === item.id}
                      onClick={() => setDefault(item.id)}
                    >
                      <CircleCheck aria-hidden="true" />
                    </IconActionButton>
                  ) : null}
                  <IconActionButton
                    variant="destructive"
                    type="button"
                    label={`${t("Delete")} ${item.label}`}
                    disabled={pendingId === item.id}
                    onClick={() => deleteAddress(item.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </IconActionButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
