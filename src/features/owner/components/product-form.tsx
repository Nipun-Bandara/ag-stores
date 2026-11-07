"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { DEFAULT_KG_MINIMUM_ORDER_QUANTITY } from "@/lib/quantity";
import { Text } from "@/features/i18n/components/text";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";

import { useFormik, type FormikProps } from "formik";
import {
  productFormValidation,
  type ProductFormValues,
} from "@/features/owner/lib/product-form-validation";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DiscountTierEditor, pricingDraft } from "./discount-tier-editor";
import { FormField } from "@/features/auth/components/form-fields";
import type {
  ProductFormOptions,
  ProductView,
} from "@/services/product.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localizeBilingual } from "@/lib/i18n/config";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Camera, ImagePlus, X } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Spinner } from "@/components/ui/spinner";
import { ProductPhotoCamera } from "./product-photo-camera";

type InputFieldName = Exclude<
  keyof ProductFormValues,
  "discountTiers" | "isAvailable"
>;
function ProductInputField({
  formik,
  name,
  ...props
}: Omit<
  ComponentProps<typeof FormField>,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur"
> & { formik: FormikProps<ProductFormValues>; name: InputFieldName }) {
  const error = formik.touched[name] && formik.errors[name];
  return (
    <div>
      <FormField
        {...props}
        {...formik.getFieldProps(name)}
        onChange={(event) => {
          void formik.setFieldValue(name, event.currentTarget.value);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
      {error ? (
        <p id={`${props.id}-error`} className="mt-1 text-xs text-destructive">
          {String(error)}
        </p>
      ) : null}
    </div>
  );
}

interface ApiPayload {
  data?: { id: string };
  error?: { message?: string; details?: Record<string, string[]> };
}

export function ProductForm({
  options,
  product,
}: {
  options: ProductFormOptions;
  product?: ProductView;
}) {
  const t = useText();
  const locale = useLocale();
  const router = useRouter();
  const initialShopId = product?.shopId ?? options.shops[0]?.id ?? "";
  const initialCategoryId =
    product?.categoryId ??
    options.categories.find((category) => category.shopId === initialShopId)
      ?.id ??
    "";
  const formik = useFormik<ProductFormValues>({
    initialValues: {
      shopId: initialShopId,
      categoryId: initialCategoryId,
      sellingUnit: product?.sellingUnit ?? "UNIT",
      nameEn: product?.nameEn ?? "",
      nameSi: product?.nameSi ?? "",
      itemCode: product?.itemCode ?? "",
      barcode: product?.barcode ?? "",
      descriptionEn: product?.descriptionEn ?? "",
      descriptionSi: product?.descriptionSi ?? "",
      price: product?.price ?? "0.00",
      stockQuantity: String(product?.stockQuantity ?? 0),
      lowStockThreshold: String(product?.lowStockThreshold ?? 5),
      minimumOrderQuantity: String(product?.minimumOrderQuantity ?? 1),
      orderingIncrement: String(product?.orderingIncrement ?? 1),
      discountTiers: (product?.discountTiers ?? []).map((tier) => ({
        minimumQuantity: String(tier.minimumQuantity),
        discountAmount: tier.discountAmount,
      })),
      isAvailable: product?.isAvailable ?? true,
    },
    validationSchema: productFormValidation(t, options),
    onSubmit: saveProduct,
  });
  const {
    shopId,
    categoryId,
    sellingUnit,
    price: regularPrice,
    discountTiers,
    minimumOrderQuantity: minimumQuantity,
    orderingIncrement: increment,
  } = formik.values;
  const fieldError = (name: keyof ProductFormValues) =>
    formik.touched[name] && typeof formik.errors[name] === "string" ? (
      <p id={`${name}-error`} className="mt-1 text-xs text-destructive">
        {String(formik.errors[name])}
      </p>
    ) : null;
  const pricingSetup = {
    sellingUnit,
    minimumOrderQuantity: Number(minimumQuantity),
    orderingIncrement:
      sellingUnit === "KG" ? 0.001 : product ? Number(increment) : 1,
  };
  const [pending, setPending] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const submissionRef = useRef(false);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";
    selectPhoto(file);
  }
  function selectPhoto(file: File) {
    setPhotoError(null);
    setUploadError(null);
    if (/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      setPhotoError(
        t(
          "HEIC photos are not supported. Export as JPEG or choose a JPEG, PNG or WebP image.",
        ),
      );
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setPhotoError(t("Choose a JPEG, PNG or WebP photo under 10 MB."));
      return;
    }
    setSelectedPhoto(file);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewRef.current);
    setUploadedId(null);
    setPhotoRemoved(false);
  }
  const categories = useMemo(
    () => options.categories.filter((category) => category.shopId === shopId),
    [options.categories, shopId],
  );

  async function saveProduct(values: ProductFormValues) {
    if (submissionRef.current) return;
    if (
      product &&
      values.sellingUnit !== product.sellingUnit &&
      (product.stockQuantity !== 0 || Number(values.stockQuantity) !== 0)
    ) {
      toast.error(
        t(
          "First save stock as 0, then change the selling unit with stock still at 0. Active orders must also be completed or cancelled.",
        ),
      );
      return;
    }
    if (photoError) {
      toast.error(photoError);
      return;
    }
    let pricing;
    try {
      pricing = pricingDraft(values.price, values.discountTiers, {
        sellingUnit: values.sellingUnit,
        minimumOrderQuantity: Number(values.minimumOrderQuantity),
        orderingIncrement: Number(values.orderingIncrement),
      });
    } catch (error) {
      toast.error(
        t(error instanceof Error ? error.message : "Invalid discount tiers."),
      );
      return;
    }
    submissionRef.current = true;
    setPending(true);
    let nextUploadId = uploadedId;
    if (selectedPhoto && !nextUploadId) {
      setPhotoError(null);
      setUploadError(null);
      const photoForm = new FormData();
      photoForm.append("photo", selectedPhoto);
      const query = new URLSearchParams({
        shopId,
        ...(product ? { productId: product.id } : {}),
      });
      const uploaded = await fetch(`/api/owner/products/photo?${query}`, {
        method: "POST",
        body: photoForm,
        signal: AbortSignal.timeout(45_000),
      }).catch(() => null);
      const uploadPayload = uploaded
        ? ((await uploaded.json().catch(() => ({}))) as ApiPayload)
        : {};
      if (!uploaded?.ok || !uploadPayload?.data?.id) {
        const message = t(
          uploadPayload?.error?.message ??
            "Photo upload failed. Please try saving again.",
        );
        setUploadError(message);
        toast.error(message);
        submissionRef.current = false;
        setPending(false);
        return;
      }
      nextUploadId = uploadPayload.data.id;
      setUploadedId(nextUploadId);
    }
    const response = await fetch(
      product ? `/api/owner/products/${product.id}` : "/api/owner/products",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          ...(!product ? { shopId } : {}),
          itemCode: values.itemCode,
          barcode: values.barcode,
          sellingUnit,
          minimumOrderQuantity: values.minimumOrderQuantity,
          orderingIncrement:
            sellingUnit === "KG"
              ? 0.001
              : product
                ? values.orderingIncrement
                : 1,
          categoryId: values.categoryId,
          nameEn: values.nameEn,
          nameSi: values.nameSi,
          descriptionEn: values.descriptionEn,
          descriptionSi: values.descriptionSi,
          price: pricing.price,
          discountTiers: pricing.tiers,
          stockQuantity: values.stockQuantity,
          lowStockThreshold: values.lowStockThreshold,
          imageUrl:
            selectedPhoto || photoRemoved ? null : (product?.imageUrl ?? null),
          imageUploadId: nextUploadId,
          isAvailable: values.isAvailable,
        }),
      },
    ).catch(() => null);

    const payload = response
      ? ((await response.json().catch(() => ({}))) as ApiPayload)
      : {};
    if (!response?.ok || !payload.data?.id) {
      toast.error(
        t(
          payload.error?.details?.discountTiers?.[0] ??
            payload.error?.message ??
            "Unable to save this product.",
        ),
      );
      submissionRef.current = false;
      setPending(false);
      return;
    }

    toast.success(
      t(product ? "Product details saved." : "Product created successfully."),
    );
    router.push("/owner/products");
    router.refresh();
  }

  return (
    <form
      className="mx-auto mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-6 lg:grid-cols-12"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Product details" />
      </h2>
      {product ? (
        <div className="sm:col-span-3 lg:col-span-6">
          <p className="text-sm font-medium">
            <Text value={t("Shop")} />
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {product.shopName}
          </p>
        </div>
      ) : (
        <div className="min-w-0 sm:col-span-3 lg:col-span-6">
          <Label htmlFor="shopId" className="block text-sm font-medium">
            <Text value={"Shop"} />
          </Label>
          <Select
            name="shopId"
            value={shopId}
            onValueChange={(value) => {
              const nextShopId = value ?? "";
              void formik.setValues((current) => ({
                ...current,
                shopId: nextShopId,
                categoryId:
                  options.categories.find(
                    (category) => category.shopId === nextShopId,
                  )?.id ?? "",
              }));
            }}
            required
          >
            <SelectTrigger
              id="shopId"
              onBlur={() => {
                void formik.setFieldTouched("shopId", true);
              }}
              aria-invalid={Boolean(
                formik.touched.shopId && formik.errors.shopId,
              )}
              aria-describedby={
                formik.touched.shopId && formik.errors.shopId
                  ? "shopId-error"
                  : undefined
              }
              className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue>
                {(value) =>
                  options.shops.find((shop) => shop.id === value)?.name ??
                  t("Select a shop")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-0">
              {options.shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("shopId")}
        </div>
      )}
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <Label htmlFor="categoryId" className="block text-sm font-medium">
          <Text value={"Category"} />
        </Label>
        <Select
          name="categoryId"
          value={categoryId}
          onValueChange={(value) => {
            void formik.setFieldValue("categoryId", value ?? "");
          }}
          disabled={categories.length === 0}
          required
        >
          <SelectTrigger
            id="categoryId"
            onBlur={() => {
              void formik.setFieldTouched("categoryId", true);
            }}
            aria-invalid={Boolean(
              formik.touched.categoryId && formik.errors.categoryId,
            )}
            aria-describedby={
              formik.touched.categoryId && formik.errors.categoryId
                ? "categoryId-error"
                : undefined
            }
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) => {
                const category = categories.find((item) => item.id === value);
                return category
                  ? `${localizeBilingual(category.nameEn, category.nameSi, locale)}${category.status === "INACTIVE" ? t(" (inactive)") : ""}`
                  : t("Select a category");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {localizeBilingual(category.nameEn, category.nameSi, locale)}
                {category.status === "INACTIVE" ? t(" (inactive)") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError("categoryId")}
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <ProductInputField
          formik={formik}
          id="nameEn"
          name="nameEn"
          label="English name"
          maxLength={180}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <ProductInputField
          formik={formik}
          id="nameSi"
          name="nameSi"
          label="Sinhala name"
          maxLength={180}
        />
      </div>
      <div className="sm:col-span-3 lg:col-span-6">
        <ProductInputField
          formik={formik}
          id="itemCode"
          name="itemCode"
          label="Item code"
          maxLength={100}
          required
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </div>
      <div className="sm:col-span-3 lg:col-span-6">
        <ProductInputField
          formik={formik}
          id="barcode"
          name="barcode"
          label="Barcode (optional)"
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </div>
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Selling setup" />
      </h2>
      <div className="min-w-0 sm:col-span-6 lg:col-span-4">
        <Label htmlFor="sellingUnit" className="block text-sm font-medium">
          <Text value="Selling unit" />
        </Label>
        <Select
          name="sellingUnit"
          value={sellingUnit}
          items={[
            {
              value: "UNIT",
              label: t("Whole units (including sealed packets)"),
            },
            { value: "KG", label: t("Kilograms (kg)") },
          ]}
          onValueChange={(value) => {
            if (value === "UNIT" || value === "KG") {
              void formik.setValues((current) => ({
                ...current,
                sellingUnit: value,
                minimumOrderQuantity:
                  product?.sellingUnit === value
                    ? String(product.minimumOrderQuantity)
                    : value === "KG"
                      ? DEFAULT_KG_MINIMUM_ORDER_QUANTITY.toFixed(3)
                      : "1",
                orderingIncrement: String(
                  product?.sellingUnit === value
                    ? product.orderingIncrement
                    : value === "KG"
                      ? 0.001
                      : 1,
                ),
              }));
            }
          }}
        >
          <SelectTrigger
            id="sellingUnit"
            onBlur={() => {
              void formik.setFieldTouched("sellingUnit", true);
            }}
            aria-invalid={Boolean(
              formik.touched.sellingUnit && formik.errors.sellingUnit,
            )}
            aria-describedby={
              formik.touched.sellingUnit && formik.errors.sellingUnit
                ? "sellingUnit-error"
                : undefined
            }
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="UNIT">
              {t("Whole units (including sealed packets)")}
            </SelectItem>
            <SelectItem value="KG">{t("Kilograms (kg)")}</SelectItem>
          </SelectContent>
        </Select>
        {fieldError("sellingUnit")}
        {product ? (
          <p className="mt-1 text-xs text-muted-foreground">
            <Text value="First save stock as 0, then change the selling unit with stock still at 0. Active orders must also be completed or cancelled." />
          </p>
        ) : null}
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-4">
        <ProductInputField
          formik={formik}
          key={`minimum-${sellingUnit}`}
          id="minimumOrderQuantity"
          name="minimumOrderQuantity"
          label="Minimum order quantity"
          type="number"
          min={sellingUnit === "KG" ? "0.002" : "1"}
          step={sellingUnit === "KG" ? "0.001" : "1"}
          readOnly={!product && sellingUnit === "UNIT"}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-4">
        {sellingUnit === "KG" ? (
          <>
            <Label className="block text-sm font-medium">
              <Text value="Ordering increment" />
            </Label>
            <p className="mt-1.5 flex h-10 items-center text-sm text-muted-foreground">
              <Text value="Not applicable" />
            </p>
          </>
        ) : (
          <ProductInputField
            formik={formik}
            key={`increment-${sellingUnit}`}
            id="orderingIncrement"
            name="orderingIncrement"
            label="Ordering increment"
            type="number"
            min="1"
            step="1"
            readOnly={!product}
            required
          />
        )}
      </div>
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Price and inventory" />
      </h2>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <ProductInputField
          formik={formik}
          id="price"
          name="price"
          label="Regular price"
          hint={sellingUnit === "KG" ? "LKR per kg" : "LKR per unit"}
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <ProductInputField
          formik={formik}
          id="stockQuantity"
          name="stockQuantity"
          label="Stock quantity"
          type="number"
          min="0"
          max="2147483647"
          step={sellingUnit === "KG" ? "0.001" : "1"}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <ProductInputField
          formik={formik}
          id="lowStockThreshold"
          name="lowStockThreshold"
          label="Low-stock threshold"
          type="number"
          min="0"
          max="2147483647"
          step={sellingUnit === "KG" ? "0.001" : "1"}
          required
        />
      </div>
      <DiscountTierEditor
        regularPrice={regularPrice}
        drafts={discountTiers}
        onChange={(tiers) => {
          void formik.setFieldValue("discountTiers", tiers);
        }}
        setup={pricingSetup}
      />
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Optional details" />
      </h2>
      <Label
        className="block min-w-0 text-sm font-medium sm:col-span-3 lg:col-span-6"
        htmlFor="descriptionEn"
      >
        <Text value={"English description "} />
        <Textarea
          id="descriptionEn"
          {...formik.getFieldProps("descriptionEn")}
          aria-invalid={Boolean(
            formik.touched.descriptionEn && formik.errors.descriptionEn,
          )}
          aria-describedby={
            formik.touched.descriptionEn && formik.errors.descriptionEn
              ? "descriptionEn-error"
              : undefined
          }
          maxLength={5000}
          className="mt-1.5 min-h-28 w-full"
        />
        {fieldError("descriptionEn")}
      </Label>
      <Label
        className="block min-w-0 text-sm font-medium sm:col-span-3 lg:col-span-6"
        htmlFor="descriptionSi"
      >
        <Text value={"Sinhala description "} />
        <Textarea
          id="descriptionSi"
          {...formik.getFieldProps("descriptionSi")}
          aria-invalid={Boolean(
            formik.touched.descriptionSi && formik.errors.descriptionSi,
          )}
          aria-describedby={
            formik.touched.descriptionSi && formik.errors.descriptionSi
              ? "descriptionSi-error"
              : undefined
          }
          maxLength={5000}
          className="mt-1.5 min-h-28 w-full"
        />
        {fieldError("descriptionSi")}
      </Label>
      <div className="min-w-0 sm:col-span-6 lg:col-span-12">
        <Label className="block text-sm font-medium">
          <Text value="Product photo" />
        </Label>
        <Attachment
          state={
            photoError || uploadError
              ? "error"
              : pending && selectedPhoto && !uploadedId
                ? "uploading"
                : previewUrl || (!photoRemoved && product?.imageUrl)
                  ? "done"
                  : "idle"
          }
          className="mt-2 w-full flex-nowrap items-start border-border"
          aria-label={t("Product photo")}
          aria-busy={Boolean(pending && selectedPhoto && !uploadedId)}
        >
          <AttachmentMedia variant="image" className="size-24 sm:size-32">
            <ImageWithFallback
              src={previewUrl ?? (photoRemoved ? null : product?.imageUrl)}
              alt={t("Product photo preview")}
              fallback={t("No photo")}
              className="size-full rounded-lg"
              sizes="128px"
            />
          </AttachmentMedia>
          <AttachmentContent className="self-center">
            <AttachmentTitle>
              {selectedPhoto?.name ?? t("Product photo")}
            </AttachmentTitle>
            <AttachmentDescription className="whitespace-normal break-words">
              {selectedPhoto
                ? `${selectedPhoto.type.replace("image/", "").toUpperCase()} · ${(selectedPhoto.size / 1024).toFixed(1)} KB`
                : t("Choose a photo or take one with your camera.")}
            </AttachmentDescription>
            {selectedPhoto ? (
              <AttachmentDescription
                className="flex items-center gap-1.5 whitespace-normal"
                aria-live="polite"
              >
                {pending && !uploadedId ? (
                  <Spinner className="size-3.5" />
                ) : null}
                {t(
                  pending && !uploadedId
                    ? "Uploading photo…"
                    : uploadedId
                      ? "Photo uploaded"
                      : "Ready to upload",
                )}
              </AttachmentDescription>
            ) : null}
          </AttachmentContent>
          {selectedPhoto || (!photoRemoved && product?.imageUrl) ? (
            <AttachmentActions>
              <AttachmentAction
                type="button"
                aria-label={t("Remove photo")}
                title={t("Remove photo")}
                disabled={pending}
                onClick={() => {
                  if (previewRef.current)
                    URL.revokeObjectURL(previewRef.current);
                  previewRef.current = null;
                  setSelectedPhoto(null);
                  setPreviewUrl(null);
                  setUploadedId(null);
                  setPhotoRemoved(true);
                  setPhotoError(null);
                  setUploadError(null);
                }}
              >
                <X aria-hidden="true" />
              </AttachmentAction>
            </AttachmentActions>
          ) : null}
        </Attachment>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={pickerRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
            aria-label={t("Choose photo")}
            disabled={pending}
          />
          <input
            ref={cameraRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={choosePhoto}
            aria-label={t("Take photo")}
            disabled={pending}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => pickerRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {t("Choose photo")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (typeof navigator.mediaDevices?.getUserMedia === "function")
                setCameraOpen(true);
              else cameraRef.current?.click();
            }}
          >
            <Camera aria-hidden="true" />
            {t("Take photo")}
          </Button>
        </div>
        {cameraOpen ? (
          <ProductPhotoCamera
            onCapture={selectPhoto}
            onClose={() => setCameraOpen(false)}
            onNativeCapture={() => cameraRef.current?.click()}
          />
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          <Text value="JPEG, PNG or WebP; original under 10 MB. The saved photo is resized to 1600 px." />
        </p>
        {photoError || uploadError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {photoError ?? uploadError}
          </p>
        ) : null}
      </div>
      <Label className="flex items-center gap-2 text-sm font-medium sm:col-span-6 lg:col-span-12">
        <Checkbox
          name="isAvailable"
          checked={formik.values.isAvailable}
          onCheckedChange={(checked) => {
            void formik.setFieldValue("isAvailable", checked);
          }}
        />
        <Text value={"Product is available "} />
      </Label>
      {categories.length === 0 ? (
        <div className="sm:col-span-6 lg:col-span-12">
          <p className="text-sm text-muted-foreground">
            <Text value={t("Create a category for this shop first.")} />
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 sm:col-span-6 lg:col-span-12">
        <Button
          variant="success"
          type="submit"
          disabled={pending || categories.length === 0}
          className="h-10"
        >
          {pending
            ? t(selectedPhoto && !uploadedId ? "Uploading photo…" : "Saving…")
            : product
              ? t("Save product")
              : t("Create product")}
        </Button>
        <Button
          variant="outline"
          type="button"
          className="h-10"
          onClick={() => router.push("/owner/products")}
        >
          <Text value={"Cancel "} />
        </Button>
      </div>
    </form>
  );
}
