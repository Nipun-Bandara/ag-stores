"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { localizeBilingual } from "@/lib/i18n/config";
import type { ProductFormOptions } from "@/services/product.service";

export interface ProductFilterValues {
  categoryId: string;
  inventoryStatus: string;
}

export function ProductFilterSelects({
  categories,
  initialCategoryId,
  initialInventoryStatus,
  value,
  onChange,
}: {
  categories: ProductFormOptions["categories"];
  initialCategoryId: string;
  initialInventoryStatus: string;
  value?: ProductFilterValues;
  onChange?: (value: ProductFilterValues) => void;
}) {
  const t = useText();
  const locale = useLocale();
  const [localValue, setLocalValue] = useState({
    categoryId: initialCategoryId,
    inventoryStatus: initialInventoryStatus,
  });
  const selected = value ?? localValue;
  function change(next: ProductFilterValues) {
    if (value === undefined) setLocalValue(next);
    onChange?.(next);
  }
  const inventoryLabels: Record<string, string> = {
    OUT_OF_STOCK: t("Out of stock"),
    LOW_STOCK: t("Low stock"),
    AVAILABLE: t("Available"),
  };

  return (
    <>
      <Label className="min-w-0 text-sm font-medium" htmlFor="categoryId">
        {t("Category")}
        <Select
          name="categoryId"
          value={selected.categoryId}
          onValueChange={(value) =>
            change({ ...selected, categoryId: value ?? "" })
          }
        >
          <SelectTrigger
            id="categoryId"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) => {
                const category = categories.find((item) => item.id === value);
                return category
                  ? localizeBilingual(category.nameEn, category.nameSi, locale)
                  : t("All categories");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="">{t("All categories")}</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {localizeBilingual(item.nameEn, item.nameSi, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      <Label className="min-w-0 text-sm font-medium" htmlFor="inventoryStatus">
        {t("Inventory")}
        <Select
          name="inventoryStatus"
          value={selected.inventoryStatus}
          onValueChange={(value) =>
            change({ ...selected, inventoryStatus: value ?? "" })
          }
        >
          <SelectTrigger
            id="inventoryStatus"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) =>
                inventoryLabels[String(value)] ?? t("All stock levels")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="">{t("All stock levels")}</SelectItem>
            <SelectItem value="OUT_OF_STOCK">
              {inventoryLabels.OUT_OF_STOCK}
            </SelectItem>
            <SelectItem value="LOW_STOCK">
              {inventoryLabels.LOW_STOCK}
            </SelectItem>
            <SelectItem value="AVAILABLE">
              {inventoryLabels.AVAILABLE}
            </SelectItem>
          </SelectContent>
        </Select>
      </Label>
    </>
  );
}
