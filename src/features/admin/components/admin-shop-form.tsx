"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type {
  AdminShopManagementView,
  AdminShopView,
} from "@/services/admin-shop.service";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const inputClass = "mt-1.5 h-10 w-full";

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
    <Card className="gap-0 p-5 sm:p-6">
      <form onSubmit={submit} className="">
        <div className="grid gap-5 sm:grid-cols-2">
          <Label className="text-sm font-medium sm:col-span-2">
            Shop owner
            <NativeSelect
              name="ownerId"
              defaultValue={shop?.ownerId ?? owners[0]?.id ?? ""}
              className={inputClass}
              required
            >
              {!owners.length ? (
                <NativeSelectOption value="">
                  No active owners
                </NativeSelectOption>
              ) : null}
              {owners.map((owner) => (
                <NativeSelectOption key={owner.id} value={owner.id}>
                  {owner.name} {owner.email ? `(${owner.email})` : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Label>
          <Label className="text-sm font-medium sm:col-span-2">
            Shop name
            <Input
              name="name"
              defaultValue={shop?.name ?? ""}
              maxLength={180}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium sm:col-span-2">
            Address
            <Textarea
              name="address"
              defaultValue={shop?.address ?? ""}
              className="mt-1.5 min-h-24 w-full p-3"
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            Phone
            <Input
              name="phone"
              type="tel"
              defaultValue={shop?.phone ?? ""}
              placeholder="+94112345678"
              className={inputClass}
              required
            />
          </Label>
          <Label className="flex items-center gap-3 self-end rounded-md border p-3 text-sm font-medium">
            <Checkbox
              name="isOpen"

              defaultChecked={shop?.isOpen ?? false}
            />
            Open for customer orders
          </Label>
          <Label className="text-sm font-medium">
            Latitude
            <Input
              name="latitude"
              type="number"
              step="0.000001"
              defaultValue={shop?.latitude ?? ""}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            Longitude
            <Input
              name="longitude"
              type="number"
              step="0.000001"
              defaultValue={shop?.longitude ?? ""}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            Minimum order amount (LKR)
            <Input
              name="minimumOrderAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={shop?.minimumOrderAmount ?? "0.00"}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            Delivery fee (LKR)
            <Input
              name="deliveryFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={shop?.deliveryFee ?? "250.00"}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium sm:col-span-2">
            Maximum delivery radius (km)
            <Input
              name="maximumDeliveryRadiusKm"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={shop?.maximumDeliveryRadiusKm ?? "50.00"}
              className={inputClass}
              required
            />
          </Label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending || owners.length === 0}>
            {pending ? "Saving…" : shop ? "Save shop" : "Create shop"}
          </Button>
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
    </Card>
  );
}
