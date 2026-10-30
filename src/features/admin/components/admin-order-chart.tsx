"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";

export function AdminOrderChart({
  data,
}: {
  data: Array<{ date: string; orders: number }>;
}) {
  const locale = useLocale();
  const t = useText();
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === "si" ? "si-LK" : "en-LK", {
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00+05:30`));
  return (
    <ChartContainer
      className="mt-4 h-52 w-full aspect-auto"
      config={{ orders: { label: t("Orders"), color: "var(--chart-1)" } }}
    >
      <BarChart
        data={data}
        accessibilityLayer
        margin={{ left: -24, right: 4, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDate}
          minTickGap={16}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatDate(String(label))}
            />
          }
        />
        <Bar
          dataKey="orders"
          fill="var(--color-orders)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}
