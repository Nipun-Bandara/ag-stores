"use client";

import { useState, type FormEvent } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
      setError(payload.error?.message ?? "Unable to save this category.");
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
          {category ? `Edit ${category.nameEn}` : "Create a category"}
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
            Shop: {category.shopName}
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
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={pending || shops.length === 0}
            className="h-10"
          >
            {pending
              ? "Saving…"
              : category
                ? "Save category"
                : "Create category"}
          </Button>
          {onCancel ? (
            <Button
              variant="outline"
              type="button"
              className="h-10"
              onClick={onCancel}
            >
              Cancel
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
      setError(payload.error?.message ?? "Unable to change category status.");
    } else {
      const payload = await readPayload(response);
      if (payload.data) saveCategory(payload.data);
    }
    setPendingId(undefined);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {initialData.shops.length === 0 ? (
        <Card as="p" className="gap-0 p-5 text-sm text-muted-foreground">
          Create a shop before adding product categories.
        </Card>
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
          Categories
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No categories have been created yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {categories.map((category) => (
              <Card as="article" key={category.id} className="gap-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{category.nameEn}</h3>
                    {category.nameSi ? (
                      <p className="mt-1 text-sm">{category.nameSi}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.shopName}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {category.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-4 text-sm font-medium">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setEditingId(category.id)}
                  >
                    Edit {category.nameEn}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={pendingId === category.id}
                    onClick={() => changeStatus(category)}
                  >
                    {category.status === "ACTIVE" ? "Deactivate" : "Activate"}{" "}
                    {category.nameEn}
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
