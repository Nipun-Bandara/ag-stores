"use client";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";
import { CircleCheck, CircleX, Pencil } from "lucide-react";

import {
  FormError,
  FormField,
  SelectField,
} from "@/features/auth/components/form-fields";
import type {
  CategoryManagementView,
  CategoryView,
} from "@/services/category.service";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { localizeBilingual } from "@/lib/i18n/config";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

interface ApiPayload {
  data?: CategoryView;
  error?: { message?: string };
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

function CategoryForm({
  shops,
  category,
  onSaved,
  onCancel,
}: {
  shops: CategoryManagementView["shops"];
  category?: CategoryView;
  onSaved: (category: CategoryView) => void;
  onCancel?: () => void;
}) {
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
      category
        ? `/api/owner/categories/${category.id}`
        : "/api/owner/categories",
      {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!category ? { shopId: form.get("shopId") } : {}),
          nameEn: form.get("nameEn"),
          nameSi: form.get("nameSi"),
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(t(payload.error?.message ?? "Unable to save this category."));
      setPending(false);
      return;
    }

    const payload = await readPayload(response);
    if (payload.data) onSaved(payload.data);
    if (!category) formElement.reset();
    setPending(false);
  }

  return (
    <Card className="gap-0 p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold">
          {category ? (
            <>
              <Text value="Edit" />{" "}
              <BilingualText
                english={category.nameEn}
                sinhala={category.nameSi}
              />
            </>
          ) : (
            t("Create a category")
          )}
        </h2>
        {!category ? (
          <SelectField id="shopId" name="shopId" label="Shop" required>
            {shops.map((shop) => (
              <NativeSelectOption key={shop.id} value={shop.id}>
                {shop.name}
              </NativeSelectOption>
            ))}
          </SelectField>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Text value={"Shop: "} />
            {category.shopName}
          </p>
        )}
        <FormField
          id={category ? `nameEn-${category.id}` : "nameEn"}
          name="nameEn"
          label="English name"
          defaultValue={category?.nameEn ?? ""}
          maxLength={120}
          required
        />
        <FormField
          id={category ? `nameSi-${category.id}` : "nameSi"}
          name="nameSi"
          label="Sinhala name"
          defaultValue={category?.nameSi ?? ""}
          maxLength={120}
        />
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="success"
            type="submit"
            disabled={pending || shops.length === 0}
            className="h-10"
          >
            {pending
              ? t("Saving…")
              : category
                ? t("Save category")
                : t("Create category")}
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

export function CategoryManager({
  initialData,
}: {
  initialData: CategoryManagementView;
}) {
  const t = useText();
  const locale = useLocale();
  const [categories, setCategories] = useState(initialData.categories);
  const [editingId, setEditingId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();
  const editingCategory = categories.find(({ id }) => id === editingId);

  function saveCategory(saved: CategoryView) {
    setCategories((current) => {
      const exists = current.some(({ id }) => id === saved.id);
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
    });
    setEditingId(undefined);
  }

  async function changeStatus(category: CategoryView) {
    setError(undefined);
    setPendingId(category.id);
    const status = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(
      `/api/owner/categories/${category.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(
        t(payload.error?.message ?? "Unable to change category status."),
      );
    } else {
      const payload = await readPayload(response);
      if (payload.data) saveCategory(payload.data);
    }
    setPendingId(undefined);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {initialData.shops.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <Text
                value={"Create a shop before adding product categories. "}
              />
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <CategoryForm
          key={editingCategory?.id ?? "new"}
          shops={initialData.shops}
          {...(editingCategory ? { category: editingCategory } : {})}
          {...(editingCategory
            ? { onCancel: () => setEditingId(undefined) }
            : {})}
          onSaved={saveCategory}
        />
      )}
      <section aria-labelledby="category-list-heading">
        <h2 id="category-list-heading" className="text-lg font-semibold">
          <Text value={"Categories "} />
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {categories.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>
                <Text value={"No categories have been created yet. "} />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-4 space-y-4">
            {categories.map((category) => (
              <Card as="article" key={category.id} className="gap-0 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      <BilingualText
                        english={category.nameEn}
                        sinhala={category.nameSi}
                      />
                    </h3>
                    {category.nameSi ? (
                      <p className="mt-1 text-sm">{category.nameSi}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.shopName}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {category.status === "ACTIVE" ? t("Active") : t("Inactive")}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
                  <IconActionButton
                    variant="ghost"
                    type="button"
                    label={`${t("Edit")} ${localizeBilingual(category.nameEn, category.nameSi, locale)}`}
                    onClick={() => setEditingId(category.id)}
                  >
                    <Pencil aria-hidden="true" />
                  </IconActionButton>
                  <IconActionButton
                    variant={
                      category.status === "ACTIVE" ? "destructive" : "success"
                    }
                    type="button"
                    label={`${t(category.status === "ACTIVE" ? "Deactivate" : "Activate")} ${localizeBilingual(category.nameEn, category.nameSi, locale)}`}
                    disabled={pendingId === category.id}
                    onClick={() => changeStatus(category)}
                  >
                    {category.status === "ACTIVE" ? (
                      <CircleX aria-hidden="true" />
                    ) : (
                      <CircleCheck aria-hidden="true" />
                    )}
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
