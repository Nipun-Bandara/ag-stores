"use client";

import { useState, type FormEvent } from "react";

import type { ShopSettingsView } from "@/services/shop-settings.service";

interface ResponsePayload {
  data?: ShopSettingsView;
  error?: { message?: string };
}

export function ShopSettingsForm({ initial }: { initial: ShopSettingsView }) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/owner/shop-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: settings.id,
        name: form.get("name"),
        address: form.get("address"),
        phone: form.get("phone"),
        latitude: form.get("latitude"),
        longitude: form.get("longitude"),
        isOpen: form.get("isOpen") === "on",
        minimumOrderAmount: form.get("minimumOrderAmount"),
        deliveryFee: form.get("deliveryFee"),
        maximumDeliveryRadiusKm: form.get("maximumDeliveryRadiusKm"),
      }),
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as ResponsePayload;
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Unable to save shop settings.");
      setPending(false);
      return;
    }
    setSettings(payload.data);
    setMessage("Shop settings saved.");
    setPending(false);
  }

  const inputClass =
    "mt-1.5 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm";

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Shop name
          <input
            name="name"
            defaultValue={settings.name}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Address
          <textarea
            name="address"
            defaultValue={settings.address}
            className="mt-1.5 min-h-24 w-full rounded-md border border-neutral-300 p-3 text-sm"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input
            name="phone"
            type="tel"
            defaultValue={settings.phone}
            className={inputClass}
            required
          />
        </label>
        <label className="flex items-center gap-3 self-end rounded-md border p-3 text-sm font-medium">
          <input
            name="isOpen"
            type="checkbox"
            defaultChecked={settings.isOpen}
          />
          Open for customer orders
        </label>
        <label className="text-sm font-medium">
          Latitude
          <input
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={settings.latitude}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Longitude
          <input
            name="longitude"
            type="number"
            step="0.000001"
            defaultValue={settings.longitude}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Minimum order amount (LKR)
          <input
            name="minimumOrderAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={settings.minimumOrderAmount}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Delivery fee (LKR)
          <input
            name="deliveryFee"
            type="number"
            min="0"
            step="0.01"
            defaultValue={settings.deliveryFee}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Maximum delivery radius (km)
          <input
            name="maximumDeliveryRadiusKm"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={settings.maximumDeliveryRadiusKm}
            className={inputClass}
            required
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Uses approximate straight-line distance, not road distance.
          </span>
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {message ? (
          <p role="status" className="text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
