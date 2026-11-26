import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/features/i18n/components/text";

function DataSkeleton() {
  return (
    <div className="mt-6 space-y-5" role="status" aria-busy="true">
      <span className="sr-only">
        <Text value="Loading" />
      </span>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
export function StaffManagementSkeleton() {
  return (
    <section className="w-full min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value="Order staff" />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value="Give each order handler their own account with access to their assigned shop." />
      </p>
      <DataSkeleton />
    </section>
  );
}
export function ReturnsSkeleton() {
  return (
    <section className="w-full min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value="Returns and refunds" />
      </h1>
      <DataSkeleton />
    </section>
  );
}
