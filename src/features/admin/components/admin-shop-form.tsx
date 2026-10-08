"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type {
  AdminShopManagementView,
  AdminShopView,
} from "@/services/admin-shop.service";

interface ShopResponse {
  data?: AdminShopView;
  error?: { message?: string };
}

export function AdminShopForm({
  owners,
  shop,
}: {
  owners: AdminShopManagementView["owners"];
  shop?: AdminShopView;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const inputClass =
    "mt-1.5 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    setIsError(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      shop ? `/api/admin/shops/${shop.id}` : "/api/admin/shops",
      {
        method: shop ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: form.get("ownerId"),
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
      },
    ).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as ShopResponse)
      : {};

    if (!response?.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Unable to save the shop.");
      setIsError(true);
      setPending(false);
      return;
    }

    if (shop) {
      setMessage("Shop details saved.");
      router.refresh();
    } else {
      router.push(`/admin/shops/${payload.data.id}`);
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Shop owner
          <select
            name="ownerId"
            defaultValue={shop?.ownerId ?? owners[0]?.id ?? ""}
            className={inputClass}
            required
          >
            {!owners.length ? <option value="">No active owners</option> : null}
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} {owner.email ? `(${owner.email})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Shop name
          <input
            name="name"
            defaultValue={shop?.name ?? ""}
            maxLength={180}
            className={inputClass}
            required
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Address
          <textarea
            name="address"
            defaultValue={shop?.address ?? ""}
            className="mt-1.5 min-h-24 w-full rounded-md border border-neutral-300 p-3 text-sm"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input
            name="phone"
            type="tel"
            defaultValue={shop?.phone ?? ""}
            placeholder="+94112345678"
            className={inputClass}
            required
          />
        </label>
        <label className="flex items-center gap-3 self-end rounded-md border p-3 text-sm font-medium">
          <input
            name="isOpen"
            type="checkbox"
            defaultChecked={shop?.isOpen ?? false}
          />
          Open for customer orders
        </label>
        <label className="text-sm font-medium">
          Latitude
          <input
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={shop?.latitude ?? ""}
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
            defaultValue={shop?.longitude ?? ""}
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
            defaultValue={shop?.minimumOrderAmount ?? "0.00"}
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
            defaultValue={shop?.deliveryFee ?? "250.00"}
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
            defaultValue={shop?.maximumDeliveryRadiusKm ?? "50.00"}
            className={inputClass}
            required
          />
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || owners.length === 0}
          className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : shop ? "Save shop" : "Create shop"}
        </button>
        {message ? (
          <p
            role={isError ? "alert" : "status"}
            className={isError ? "text-sm text-red-700" : "text-sm"}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
