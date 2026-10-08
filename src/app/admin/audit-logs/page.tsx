import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { listAuditLogs } from "@/services/audit-log.service";

const formatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

export default async function AdminAuditLogsPage() {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/audit-logs");
  const logs = await listAuditLogs(administrator);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={administrator} />
      <section className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Audit logs</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Recent sensitive administrative and business actions.
        </p>
        {logs.length ? (
          <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Safe metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} data-testid="audit-log-row">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatter.format(new Date(log.createdAt))}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.actorId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{log.entityType}</span>
                      <span className="mt-1 block font-mono text-xs">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-3 font-mono text-xs break-words">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-neutral-600">
            No audit records have been created yet.
          </p>
        )}
      </section>
    </main>
  );
}
