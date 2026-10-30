"use client";
import { Text } from "@/features/i18n/components/text";

import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { routePath, type Locale } from "@/lib/i18n/config";
import { getNavGroupsForRole, isRole, ROLE_LABELS } from "@/lib/navigation";
import { Card } from "@/components/ui/card";
import { translate } from "@/lib/i18n/text";

export function RoleDashboard({
  locale,
  localizedRoute,
}: {
  locale: Locale;
  localizedRoute: boolean;
}) {
  const { user } = useAuth();
  if (!user || !isRole(user.role)) return null;
  const groups = getNavGroupsForRole(user.role);

  return (
    <section className="min-w-0 w-full space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {translate(locale, ROLE_LABELS[user.role])}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {translate(
            locale,
            {
              CUSTOMER: "Dashboard",
              SHOP_OWNER: "Owner dashboard",
              ADMIN: "Admin dashboard",
              DELIVERY_PERSON: "Delivery dashboard",
            }[user.role],
          )}
        </h1>
        <p className="mt-2 text-muted-foreground">
          <Text value={"Welcome, "} />
          {user.name}
          <Text value={". Your workspace is organized around your role. "} />
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups
          .filter((group) =>
            group.items.some((item) => item.group !== "overview"),
          )
          .map((group) => (
            <Card as="section" key={group.id} className="gap-0 bg-card p-5">
              <h2 className="font-semibold">
                {translate(locale, group.label)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.items
                  .filter((item) => item.group !== "overview")
                  .map((item) => (
                    <li key={item.id}>
                      <Link
                        className="text-sm text-primary hover:underline"
                        href={routePath(item.href, locale, localizedRoute)}
                      >
                        {translate(locale, item.label)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
      </div>
    </section>
  );
}
