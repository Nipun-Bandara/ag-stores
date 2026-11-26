import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/features/i18n/components/text";

export function CheckoutProductsSkeleton({ count = 2 }: { count?: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      aria-hidden="true"
      className="flex flex-wrap justify-between gap-4 py-4"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-32 max-w-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="w-52 max-w-full space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  ));
}

export function CheckoutSkeleton() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
      aria-busy="true"
    >
      <div className="min-w-0 space-y-6">
        <Card as="section" className="gap-0 p-5 sm:p-6">
          <h2 className="text-xl font-black text-foreground">
            <Text value="Delivery address " />
          </h2>
          <div className="mt-4 space-y-3" aria-hidden="true">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={index}
                className="flex gap-3 rounded-xl border border-border p-4"
              >
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card as="section" className="gap-0 p-5 sm:p-6">
          <h2 className="text-xl font-black text-foreground">
            <Text value="Review products " />
          </h2>
          <div className="mt-4 divide-y divide-border">
            <CheckoutProductsSkeleton />
          </div>
        </Card>
        <Card as="section" className="gap-0 p-5 sm:p-6">
          <Label
            htmlFor="loading-delivery-instructions"
            className="text-base font-bold text-foreground"
          >
            <Text value="Delivery instructions" />{" "}
            <span className="font-normal">
              <Text value="(optional)" />
            </span>
          </Label>
          <Textarea
            id="loading-delivery-instructions"
            disabled
            rows={4}
            className="mt-3 w-full p-3"
          />
        </Card>
      </div>
      <Card as="aside" className="h-fit min-w-0 gap-0 p-6">
        <h2 className="text-xl font-black text-foreground">
          <Text value="Order summary" />
        </h2>
        <dl className="mt-6 space-y-4 text-sm">
          {["Subtotal", "Delivery fee", "Total"].map((label) => (
            <div
              key={label}
              className={
                label === "Total"
                  ? "flex justify-between gap-3 border-t border-border pt-4 text-base font-black text-foreground"
                  : "flex justify-between gap-3"
              }
            >
              <dt>
                <Text value={label} />
              </dt>
              <dd>
                <Skeleton className="h-5 w-24" aria-hidden="true" />
              </dd>
            </div>
          ))}
        </dl>
        <Card className="mt-6 gap-0 bg-muted/50 p-4">
          <span className="block font-bold">
            <Text value="Payment method" />
          </span>
          <span className="mt-1 block text-muted-foreground">
            <Text value="Cash on Delivery " />
          </span>
        </Card>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          <Text value="Prices, availability, stock, delivery fee, and total are recalculated by the server when you confirm. " />
        </p>
        <Button
          variant="success"
          disabled
          className="mt-6 h-auto min-h-9 w-full whitespace-normal break-words py-2 text-center"
        >
          <Text value="Confirm Cash on Delivery order" />
        </Button>
      </Card>
    </div>
  );
}
