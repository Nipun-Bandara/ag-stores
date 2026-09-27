"use client";

import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/features/auth/components/form-fields";
import type { CustomerAddressView } from "@/services/customer-address.service";

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
          isDefault: form.get("isDefault") === "on",
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(payload.error?.message ?? "Unable to save this address.");
      setPending(false);
      return;
    }

    const payload = await readPayload(response);
    if (payload.data) onSaved(payload.data);
    if (!address) formElement.reset();
    setPending(false);
  }

  return (
    <form className="space-y-4 rounded-xl border p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold">
        {address ? `Edit ${address.label}` : "Add an address"}
      </h2>
      <FormField
        id={address ? `label-${address.id}` : "label"}
        name="label"
        label="Label"
        placeholder="Home, Office, or Other"
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
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="isDefault"
          type="checkbox"
          defaultChecked={address?.isDefault ?? false}
          disabled={address?.isDefault ?? false}
        />
        Use as default address
      </label>
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : address ? "Save changes" : "Add address"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="h-10 rounded-md border px-5 text-sm font-medium"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function AddressManager({
  initialAddresses,
}: {
  initialAddresses: CustomerAddressView[];
}) {
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
      setError(payload.error?.message ?? "Unable to set the default address.");
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
      setError(payload.error?.message ?? "Unable to delete this address.");
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
          Saved addresses
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {addresses.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">
            You have no saved delivery addresses.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {addresses.map((item) => (
              <article key={item.id} className="rounded-xl border p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold">{item.label}</h3>
                  {item.isDefault ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-neutral-700">{item.address}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {item.latitude}, {item.longitude}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                  <button type="button" onClick={() => setEditingId(item.id)}>
                    Edit {item.label}
                  </button>
                  {!item.isDefault ? (
                    <button
                      type="button"
                      disabled={pendingId === item.id}
                      onClick={() => setDefault(item.id)}
                    >
                      Make {item.label} default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pendingId === item.id}
                    className="text-red-700"
                    onClick={() => deleteAddress(item.id)}
                  >
                    Delete {item.label}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
