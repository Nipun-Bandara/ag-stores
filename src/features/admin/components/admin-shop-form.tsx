"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import type {
  AdminShopManagementView,
  AdminShopView,
} from "@/services/admin-shop.service";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  LocationPicker,
  parsePickedLocation,
} from "@/features/maps/components/location-picker";

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
  const t = useText();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [ownerId, setOwnerId] = useState(shop?.ownerId ?? owners[0]?.id ?? "");
  const [isOpen, setIsOpen] = useState(shop?.isOpen ?? false);
  const [pending, setPending] = useState(false);
  const [location, setLocation] = useState(() =>
    parsePickedLocation(shop?.latitude, shop?.longitude),
  );
  const inputClass = "mt-1.5 h-10 w-full";
  const ownerOptions = owners.map((owner) => ({
    value: owner.id,
    label: `${owner.name}${owner.email ? ` (${owner.email})` : ""}`,
    disabled: false,
  }));
  if (shop && !ownerOptions.some((option) => option.value === shop.ownerId)) {
    ownerOptions.push({
      value: shop.ownerId,
      label: `${shop.owner.name}${t(" (inactive)")}`,
      disabled: true,
    });
  }
  const ownerInputId = `shop-owner-${shop?.id ?? "new"}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location) {
      const message = t("Choose a location before saving.");
      setError(message);
      toast.error(message);
      return;
    }
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      shop ? `/api/admin/shops/${shop.id}` : "/api/admin/shops",
      {
        method: shop ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          name: form.get("name"),
          address: form.get("address"),
          phone: form.get("phone"),
          latitude: form.get("latitude"),
          longitude: form.get("longitude"),
          isOpen,
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
      const message = t(payload.error?.message ?? "Unable to save the shop.");
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }

    if (shop) {
      toast.success(t("Shop details saved."));
      router.refresh();
    } else {
      toast.success(t("Shop created successfully."));
      router.push(`/admin/shops/${payload.data.id}`);
    }
    setPending(false);
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div
          className={`grid gap-4 sm:grid-cols-2 ${shop ? "xl:grid-cols-3" : ""}`}
        >
          <div className={`min-w-0 ${!shop ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={ownerInputId} className="block text-sm font-medium">
              <Text value="Shop owner" />
            </Label>
            <Select
              name="ownerId"
              value={ownerId}
              onValueChange={(value) => {
                if (value !== null) setOwnerId(value);
              }}
              items={ownerOptions}
              required
              disabled={owners.length === 0}
            >
              <SelectTrigger
                id={ownerInputId}
                className="mt-1.5 h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue placeholder={t("No active owners")} />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-0">
                {ownerOptions.map((owner) => (
                  <SelectItem
                    key={owner.value}
                    value={owner.value}
                    disabled={owner.disabled}
                  >
                    {owner.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Label className="min-w-0 text-sm font-medium">
            <Text value="Shop name" />
            <Input
              name="name"
              defaultValue={shop?.name ?? ""}
              maxLength={180}
              className={inputClass}
              required
            />
          </Label>
          <Label className="min-w-0 text-sm font-medium">
            <Text value="Phone" />
            <Input
              name="phone"
              type="tel"
              defaultValue={shop?.phone ?? ""}
              placeholder="+94112345678"
              className={inputClass}
              required
            />
          </Label>
        </div>
        <div
          className={`grid gap-5 ${shop ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}
        >
          <Label className="flex min-w-0 flex-col text-sm font-medium">
            <Text value="Address" />
            <Textarea
              name="address"
              defaultValue={shop?.address ?? ""}
              className="mt-1.5 min-h-28 w-full flex-1 p-3"
              required
            />
          </Label>
          <div className="min-w-0 rounded-lg bg-muted/40 p-3">
            <LocationPicker value={location} onChange={setLocation} />
          </div>
        </div>
        <div
          className={`grid gap-4 sm:grid-cols-2 ${shop ? "lg:grid-cols-3" : ""}`}
        >
          <Label className="min-w-0 text-sm font-medium">
            <Text value="Minimum order amount (LKR)" />
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
          <Label className="min-w-0 text-sm font-medium">
            <Text value="Delivery fee (LKR)" />
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
          <Label
            className={`min-w-0 text-sm font-medium ${!shop ? "sm:col-span-2" : ""}`}
          >
            <Text value="Maximum delivery radius (km)" />
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
        {error ? (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Label className="flex items-center gap-3 text-sm font-medium">
            <Checkbox
              name="isOpen"
              checked={isOpen}
              onCheckedChange={setIsOpen}
            />
            <Text value="Open for customer orders" />
          </Label>
          <Button
            variant="success"
            type="submit"
            disabled={pending || owners.length === 0}
            className="h-10"
          >
            {pending ? t("Saving…") : shop ? t("Save shop") : t("Create shop")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
