"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/features/auth/components/form-fields";
import type { CustomerAddressView } from "@/services/customer-address.service";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
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
    if (!address) formElement.reset();
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={address ? `latitude-${address.id}` : "latitude"}
            name="latitude"
            label="Latitude"
            type="number"
            min={-90}
            max={90}
            step="0.000001"
            defaultValue={address?.latitude ?? ""}
            required
          />
          <FormField
            id={address ? `longitude-${address.id}` : "longitude"}
            name="longitude"
            label="Longitude"
            type="number"
            min={-180}
            max={180}
            step="0.000001"
            defaultValue={address?.longitude ?? ""}
            required
          />
        </div>
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
          <Button type="submit" disabled={pending} className="h-10">
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
          <p className="mt-4 text-sm text-muted-foreground">
            <Text value={"You have no saved delivery addresses. "} />
          </p>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.latitude}, {item.longitude}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-auto max-w-full whitespace-normal break-words text-left"
                    onClick={() => setEditingId(item.id)}
                  >
                    <Text value={"Edit "} />
                    {item.label}
                  </Button>
                  {!item.isDefault ? (
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-auto max-w-full whitespace-normal break-words text-left"
                      disabled={pendingId === item.id}
                      onClick={() => setDefault(item.id)}
                    >
                      <Text value={"Make "} />
                      {item.label} <Text value={"default "} />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-auto max-w-full whitespace-normal break-words text-left"
                    disabled={pendingId === item.id}
                    onClick={() => deleteAddress(item.id)}
                  >
                    <Text value={"Delete "} />
                    {item.label}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
