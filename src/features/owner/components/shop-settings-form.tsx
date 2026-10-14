"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";

import type { ShopSettingsView } from "@/services/shop-settings.service";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

interface ResponsePayload {
  data?: ShopSettingsView;
  error?: { message?: string };
}

export function ShopSettingsForm({ initial }: { initial: ShopSettingsView }) {
  const t = useText();
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
      setMessage(t(payload.error?.message ?? "Unable to save shop settings."));
      setPending(false);
      return;
    }
    setSettings(payload.data);
    setMessage(t("Shop settings saved."));
    setPending(false);
  }

  const inputClass = "mt-1.5 h-10 w-full";

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <form onSubmit={submit} className="">
        {!settings.isActive ? (
          <p className="mb-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <Text
              value={
                "This shop is administratively inactive. Customers cannot browse or order from it until an administrator reactivates it. "
              }
            />
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <Label className="text-sm font-medium sm:col-span-2">
            <Text value={"Shop name "} />
            <Input
              name="name"
              defaultValue={settings.name}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium sm:col-span-2">
            <Text value={"Address "} />
            <Textarea
              name="address"
              defaultValue={settings.address}
              className="mt-1.5 min-h-24 w-full p-3"
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            <Text value={"Phone "} />
            <Input
              name="phone"
              type="tel"
              defaultValue={settings.phone}
              className={inputClass}
              required
            />
          </Label>
          <Label className="flex items-center gap-3 self-end rounded-md border p-3 text-sm font-medium">
            <Checkbox
              name="isOpen"

              disabled={!settings.isActive}
              defaultChecked={settings.isOpen}
            />
            <Text value={"Open for customer orders "} />
          </Label>
          <Label className="text-sm font-medium">
            <Text value={"Latitude "} />
            <Input
              name="latitude"
              type="number"
              step="0.000001"
              defaultValue={settings.latitude}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            <Text value={"Longitude "} />
            <Input
              name="longitude"
              type="number"
              step="0.000001"
              defaultValue={settings.longitude}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            <Text value={"Minimum order amount (LKR) "} />
            <Input
              name="minimumOrderAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.minimumOrderAmount}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium">
            <Text value={"Delivery fee (LKR) "} />
            <Input
              name="deliveryFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.deliveryFee}
              className={inputClass}
              required
            />
          </Label>
          <Label className="text-sm font-medium sm:col-span-2">
            <Text value={"Maximum delivery radius (km) "} />
            <Input
              name="maximumDeliveryRadiusKm"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={settings.maximumDeliveryRadiusKm}
              className={inputClass}
              required
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              <Text
                value={
                  "Uses approximate straight-line distance, not road distance. "
                }
              />
            </span>
          </Label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? t("Saving…") : t("Save settings")}
          </Button>
          {message ? (
            <Alert variant="success" role="status" className="">
              {message}
            </Alert>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
