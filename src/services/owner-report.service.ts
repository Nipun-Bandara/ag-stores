import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import {
  PrismaOwnerReportRepository,
  type OwnerReportRepository,
} from "@/repositories/owner-report.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { OwnerReportFiltersInput } from "@/validations/owner-report";

const COLOMBO_OFFSET_MILLISECONDS = 5.5 * 60 * 60 * 1000;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

export class OwnerReportError extends Error {
  readonly code = "OWNER_ONLY";
  readonly status = 403;

  constructor() {
    super("Shop owner access is required.");
    this.name = "OwnerReportError";
  }
}

function repository(): OwnerReportRepository {
  return new PrismaOwnerReportRepository(getDb());
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

export function colomboDateStart(value: string): Date {
  const { year, month, day } = dateParts(value);
  return new Date(Date.UTC(year, month - 1, day) - COLOMBO_OFFSET_MILLISECONDS);
}

function localDateString(value: Date): string {
  return new Date(value.getTime() + COLOMBO_OFFSET_MILLISECONDS)
    .toISOString()
    .slice(0, 10);
}

export function getDefaultOwnerReportRange(now: Date) {
  const localToday = new Date(now.getTime() + COLOMBO_OFFSET_MILLISECONDS);
  const to = localToday.toISOString().slice(0, 10);
  const from = new Date(localToday.getTime() - 29 * DAY_MILLISECONDS)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export async function getOwnerReports(
  user: AuthenticatedUser,
  filters: OwnerReportFiltersInput = {},
  reports: OwnerReportRepository = repository(),
  now = new Date(),
) {
  if (user.role !== UserRole.SHOP_OWNER) throw new OwnerReportError();

  const defaults = getDefaultOwnerReportRange(now);
  const from = filters.from ?? defaults.from;
  const to = filters.to ?? defaults.to;
  const fromDate = colomboDateStart(from);
  const toExclusive = new Date(
    colomboDateStart(to).getTime() + DAY_MILLISECONDS,
  );
  const aggregate = await reports.aggregateOwned(user.id, {
    from: fromDate,
    toExclusive,
    ...(filters.status ? { status: filters.status } : {}),
  });
  const totalRevenueMinor = aggregate.dailyRevenue.reduce(
    (total, metric) => addMinorUnits(total, moneyToMinorUnits(metric.revenue)),
    "0",
  );

  return {
    filters: { from, to, status: filters.status ?? null },
    period: {
      from: localDateString(fromDate),
      to,
    },
    summary: {
      totalOrders: aggregate.dailyOrders.reduce(
        (total, metric) => total + metric.orders,
        0,
      ),
      totalRevenue: minorUnitsToMoney(totalRevenueMinor),
      completedDeliveries: aggregate.completedDeliveries,
      failedDeliveries: aggregate.failedDeliveries,
    },
    ...aggregate,
  };
}

export type OwnerReportsView = Awaited<ReturnType<typeof getOwnerReports>>;
