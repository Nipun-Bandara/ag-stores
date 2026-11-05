import { CheckoutSkeleton } from "@/features/checkout/components/checkout-skeleton";
import { Text } from "@/features/i18n/components/text";

export default function CheckoutLoading() {
  return (
    <section className="min-w-0 w-full">
      <p className="text-sm font-bold text-emerald-700">
        <Text value="Cash on Delivery" />
      </p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
        <Text value="Checkout " />
      </h1>
      <div className="mt-8">
        <CheckoutSkeleton />
      </div>
    </section>
  );
}
