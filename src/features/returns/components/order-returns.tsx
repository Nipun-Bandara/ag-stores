"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import type { getOwnerOrder } from "@/services/owner-order.service";
import type { OrderReturnView } from "@/services/order-return.service";
import type { ReturnActionInput } from "@/validations/order-return";
import { localizeBilingual } from "@/lib/i18n/config";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { DateText } from "@/features/i18n/components/date-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

type Order = Awaited<ReturnType<typeof getOwnerOrder>>;
export function OrderReturns({
  order,
  returns,
  canReview,
}: {
  order: Order;
  returns: OrderReturnView[];
  canReview: boolean;
}) {
  const t = useText();
  const locale = useLocale();
  const router = useRouter();
  const [review, setReview] = useState<OrderReturnView>();
  async function act(record: OrderReturnView, action: ReturnActionInput) {
    try {
      const response = await fetch(
        `/api/owner/orders/${order.id}/returns/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.message ?? "Unable to process this return.",
        );
      toast.success(
        t(
          action.action === "refund-paid"
            ? "Cash refund recorded."
            : "Return reviewed.",
        ),
      );
      setReview(undefined);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        t(
          error instanceof Error
            ? error.message
            : "Unable to process this return.",
        ),
      );
      return false;
    }
  }
  if (order.status !== "DELIVERED" && !returns.length) return null;
  return (
    <Card id="returns" className="mt-6 min-w-0 gap-0 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{t("Returns and refunds")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Record returned items here. Only the owner can approve restocking. Refunds cover returned items, excluding delivery fees.",
        )}
      </p>
      {order.status === "DELIVERED" ? (
        <RecordReturnForm order={order} returns={returns} />
      ) : null}
      {returns.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {returns.map((record) => {
            const item = order.items.find(
              (item) => item.id === record.orderItemId,
            );
            return (
              <div
                key={record.id}
                className="min-w-0 rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="break-words font-medium">
                    {item
                      ? localizeBilingual(item.nameEn, item.nameSi, locale)
                      : t("Product")}
                  </h3>
                  <Badge
                    variant={
                      record.status === "PENDING"
                        ? "warning"
                        : record.status === "APPROVED"
                          ? "success"
                          : "destructive"
                    }
                  >
                    {t(
                      record.status === "PENDING"
                        ? "Pending review"
                        : record.status === "APPROVED"
                          ? "Approved"
                          : "Rejected",
                    )}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">
                  {record.quantity}{" "}
                  {t(item?.sellingUnit === "KG" ? "kg" : "units")} ·{" "}
                  {t("Refund")}: LKR {record.refundAmount}
                </p>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {record.reason}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <DateText value={record.createdAt} />
                </p>
                {record.status === "APPROVED" ? (
                  <p className="mt-2 text-sm">
                    {t(
                      record.restock
                        ? "Returned to saleable stock"
                        : "Not returned to saleable stock",
                    )}
                  </p>
                ) : null}
                {record.reviewNote ? (
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    {record.reviewNote}
                  </p>
                ) : null}
                {record.status === "PENDING" && canReview ? (
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => setReview(record)}
                  >
                    {t("Review return")}
                  </Button>
                ) : null}
                {record.status === "APPROVED" ? (
                  record.refundPaidAt ? (
                    <p className="mt-3 text-sm font-medium">
                      {t("Cash refund paid")} ·{" "}
                      <DateText value={record.refundPaidAt} />
                    </p>
                  ) : Number(record.refundAmount) > 0 ? (
                    <ConfirmAction
                      title={t("Record cash refund paid?")}
                      description={t(
                        "Confirm only after handing the refund to the customer. This does not transfer money.",
                      )}
                      confirmLabel={t("Record refund paid")}
                      variant="success"
                      onConfirm={() => act(record, { action: "refund-paid" })}
                    >
                      <Button className="mt-3" variant="outline">
                        {t("Record refund paid")}
                      </Button>
                    </ConfirmAction>
                  ) : (
                    <p className="mt-3 text-sm">{t("No refund due")}</p>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty className="mt-4 p-5">
          <EmptyHeader>
            <EmptyTitle>{t("No returns recorded.")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <Dialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) setReview(undefined);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Review return")}</DialogTitle>
            <DialogDescription>
              {t(
                "Approve the return and choose whether the goods are suitable for resale, or reject it with a reason.",
              )}
            </DialogDescription>
          </DialogHeader>
          {review ? (
            <ReviewReturnForm
              key={review.id}
              onSave={(input) => act(review, input)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RecordReturnForm({
  order,
  returns,
}: {
  order: Order;
  returns: OrderReturnView[];
}) {
  const t = useText();
  const locale = useLocale();
  const router = useRouter();
  const [requestId, setRequestId] = useState<string>();
  const remaining = (id: string) => {
    const item = order.items.find((item) => item.id === id);
    return item
      ? Math.max(
          0,
          Number(
            (
              (item.packedQuantity ?? item.quantity) -
              returns
                .filter(
                  (row) => row.orderItemId === id && row.status !== "REJECTED",
                )
                .reduce((total, row) => total + row.quantity, 0)
            ).toFixed(3),
          ),
        )
      : 0;
  };
  const available = order.items.filter((item) => remaining(item.id) > 0);
  const formik = useFormik({
    initialValues: {
      orderItemId: available[0]?.id ?? "",
      quantity: "",
      reason: "",
    },
    validationSchema: Yup.object({
      orderItemId: Yup.string().required(t("Required")),
      quantity: Yup.string()
        .required(t("Required"))
        .matches(
          /^(?:0|[1-9]\d{0,9})(?:\.\d{1,3})?$/,
          t("Enter a valid return quantity."),
        ),
      reason: Yup.string()
        .trim()
        .min(3, t("Enter a reason with at least 3 characters."))
        .max(500)
        .required(t("Required")),
    }),
    onSubmit: async (values, helpers) => {
      const quantity = Number(values.quantity);
      const item = order.items.find((item) => item.id === values.orderItemId);
      if (
        quantity <= 0 ||
        quantity > remaining(values.orderItemId) ||
        (item?.sellingUnit === "UNIT" && !Number.isInteger(quantity))
      ) {
        helpers.setFieldError(
          "quantity",
          t("Enter a valid quantity within the remaining delivered quantity."),
        );
        return;
      }
      const id = requestId ?? crypto.randomUUID();
      setRequestId(id);
      try {
        const response = await fetch(`/api/owner/orders/${order.id}/returns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, requestId: id }),
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "Unable to process this return.",
          );
        toast.success(t("Return recorded for owner review."));
        setRequestId(undefined);
        helpers.resetForm();
        router.refresh();
      } catch (error) {
        toast.error(
          t(
            error instanceof Error
              ? error.message
              : "Unable to process this return.",
          ),
        );
      }
    },
  });
  if (!available.length) return null;
  return (
    <form
      className="mt-5 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_0.7fr_1.5fr_auto]"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <Label htmlFor="return-item" className="block min-w-0">
        {t("Returned item")}
        <Select
          value={formik.values.orderItemId}
          onValueChange={(value) => {
            setRequestId(undefined);
            void formik.setFieldValue("orderItemId", value ?? "");
          }}
        >
          <SelectTrigger
            id="return-item"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) => {
                const item = order.items.find((item) => item.id === value);
                return item
                  ? localizeBilingual(item.nameEn, item.nameSi, locale)
                  : t("Select an item");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {available.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {localizeBilingual(item.nameEn, item.nameSi, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      <Label htmlFor="return-quantity" className="block min-w-0">
        {t("Quantity")}
        <Input
          id="return-quantity"
          className="mt-1.5 h-10"
          inputMode="decimal"
          {...formik.getFieldProps("quantity")}
          onChange={(event) => {
            setRequestId(undefined);
            formik.handleChange(event);
          }}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {t("Remaining")}: {remaining(formik.values.orderItemId)}{" "}
          {t(
            order.items.find((item) => item.id === formik.values.orderItemId)
              ?.sellingUnit === "KG"
              ? "kg"
              : "units",
          )}
        </span>
        {formik.touched.quantity && formik.errors.quantity ? (
          <span className="block text-xs text-destructive">
            {formik.errors.quantity}
          </span>
        ) : null}
      </Label>
      <Label htmlFor="return-reason" className="block min-w-0">
        {t("Reason")}
        <Input
          id="return-reason"
          className="mt-1.5 h-10"
          maxLength={500}
          {...formik.getFieldProps("reason")}
          onChange={(event) => {
            setRequestId(undefined);
            formik.handleChange(event);
          }}
        />
        {formik.touched.reason && formik.errors.reason ? (
          <span className="mt-1 block text-xs text-destructive">
            {formik.errors.reason}
          </span>
        ) : null}
      </Label>
      <Button
        type="submit"
        className="h-10 xl:mt-6"
        disabled={formik.isSubmitting}
      >
        {t("Record return")}
      </Button>
    </form>
  );
}

function ReviewReturnForm({
  onSave,
}: {
  onSave: (input: ReturnActionInput) => Promise<boolean>;
}) {
  const t = useText();
  const formik = useFormik({
    initialValues: { action: "approve", restock: false, note: "" },
    validationSchema: Yup.object({
      note: Yup.string()
        .max(500)
        .when("action", {
          is: "reject",
          then: (schema) =>
            schema
              .trim()
              .min(3, t("Enter a reason with at least 3 characters."))
              .required(t("Required")),
        }),
    }),
    onSubmit: async (values) => {
      await onSave(
        values.action === "approve"
          ? { action: "approve", restock: values.restock, note: values.note }
          : { action: "reject", note: values.note },
      );
    },
  });
  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4" noValidate>
      <Label htmlFor="return-decision" className="block">
        {t("Decision")}
        <Select
          value={formik.values.action}
          onValueChange={(value) => void formik.setFieldValue("action", value)}
        >
          <SelectTrigger
            id="return-decision"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) => t(value === "approve" ? "Approve" : "Reject")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="approve">{t("Approve")}</SelectItem>
            <SelectItem value="reject">{t("Reject")}</SelectItem>
          </SelectContent>
        </Select>
      </Label>
      {formik.values.action === "approve" ? (
        <Label className="flex items-start gap-3">
          <Checkbox
            checked={formik.values.restock}
            onCheckedChange={(checked) =>
              void formik.setFieldValue("restock", checked === true)
            }
          />
          {t("Goods are suitable for resale. Add this quantity back to stock.")}
        </Label>
      ) : null}
      <Label htmlFor="return-review-note" className="block">
        {t("Review note")}
        <Textarea
          id="return-review-note"
          className="mt-1.5"
          maxLength={500}
          {...formik.getFieldProps("note")}
        />
        {formik.touched.note && formik.errors.note ? (
          <span className="mt-1 block text-xs text-destructive">
            {formik.errors.note}
          </span>
        ) : null}
      </Label>
      <Button
        type="submit"
        variant={formik.values.action === "approve" ? "success" : "destructive"}
        disabled={formik.isSubmitting}
      >
        {t(
          formik.values.action === "approve"
            ? "Approve return"
            : "Reject return",
        )}
      </Button>
    </form>
  );
}
