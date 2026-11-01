import { AuditLogPagination } from "@/features/admin/components/audit-log-pagination";
import { auditLogFiltersSchema } from "@/validations/audit-log";
import Link from "next/link";
import { getServerText } from "@/lib/i18n/server";
import { presentAuditLog } from "@/features/admin/lib/audit-log-presentation";
import { AuditLogDetails } from "@/features/admin/components/audit-log-details";
import { Text } from "@/features/i18n/components/text";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { getAuditLogPage } from "@/services/audit-log.service";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DateText } from "@/features/i18n/components/date-text";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/audit-logs");
  const query = await searchParams;
  const filters = auditLogFiltersSchema.safeParse(query);
  const result = await getAuditLogPage(
    administrator,
    { page: query.page, pageSize: query.pageSize },
    filters.success
      ? {
          ...(filters.data.action ? { action: filters.data.action } : {}),
          ...(filters.data.entityType
            ? { entityType: filters.data.entityType }
            : {}),
        }
      : {},
  );
  const logs = result.records;
  const t = await getServerText();

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Audit logs"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={"Recent sensitive administrative and business actions. "}
        />
      </p>
      <Card className="mt-6 min-w-0 gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Text value="Time" />
              </TableHead>
              <TableHead>
                <Text value="Activity" />
              </TableHead>
              <TableHead>
                <Text value="Changed by" />
              </TableHead>
              <TableHead>
                <Text value="Affected record" />
              </TableHead>
              <TableHead className="text-right">
                <Text value="Details" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!logs.length ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>
                        <Text
                          value={
                            result.page > 1
                              ? "No records on this page"
                              : "No audit records have been created yet."
                          }
                        />
                      </EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : null}
            {logs.map((log) => {
              const view = presentAuditLog(log, t);
              return (
                <TableRow key={log.id} data-testid="audit-log-row">
                  <TableCell className="whitespace-nowrap align-top">
                    <DateText value={log.createdAt} />
                  </TableCell>
                  <TableCell className="min-w-64 max-w-md whitespace-normal align-top">
                    <p className="font-medium">{view.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {view.summary}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-36 max-w-52 whitespace-normal break-words align-top">
                    {view.actor}
                  </TableCell>
                  <TableCell className="min-w-40 max-w-64 whitespace-normal break-words align-top">
                    {view.entityHref ? (
                      <Link
                        href={view.entityHref}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {view.entity}
                      </Link>
                    ) : (
                      <p className="font-medium">{view.entity}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {view.entityType}
                    </p>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <AuditLogDetails log={log} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <AuditLogPagination
          page={result.page}
          pageSize={result.pageSize}
          recordCount={logs.length}
          hasPrevious={result.hasPrevious}
          hasNext={result.hasNext}
        />
      </Card>
    </section>
  );
}
