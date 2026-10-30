import { Text } from "@/features/i18n/components/text";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listAuditLogs } from "@/services/audit-log.service";
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

export default async function AdminAuditLogsPage() {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/audit-logs");
  const logs = await listAuditLogs(administrator);

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
      {logs.length ? (
        <Card className="gap-0 mt-6 overflow-x-auto">
          <Table className="min-w-full text-left text-sm">
            <TableHeader className="border-b bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 py-3 font-medium">
                  <Text value={"Time"} />
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  <Text value={"Action"} />
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  <Text value={"Actor"} />
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  <Text value={"Entity"} />
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  <Text value={"Safe metadata "} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {logs.map((log) => (
                <TableRow key={log.id} data-testid="audit-log-row">
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    <DateText value={log.createdAt} />
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium">
                    {log.action}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs">
                    {log.actorId}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="font-medium">{log.entityType}</span>
                    <span className="mt-1 block font-mono text-xs">
                      {log.entityId}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-sm px-4 py-3 font-mono text-xs break-words">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Empty className="mt-6">
          <EmptyHeader>
            <EmptyTitle>
              <Text value={"No audit records have been created yet. "} />
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
