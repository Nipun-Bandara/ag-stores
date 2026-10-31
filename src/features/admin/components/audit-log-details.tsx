"use client";

import { Fragment } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateText } from "@/features/i18n/components/date-text";
import { useText } from "@/features/i18n/components/locale-provider";
import { presentAuditLog } from "@/features/admin/lib/audit-log-presentation";
import type { AuditLogView } from "@/services/audit-log.service";

export function AuditLogDetails({ log }: { log: AuditLogView }) {
  const t = useText();
  const view = presentAuditLog(log, t);
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`${t("View audit details")}: ${view.action}`}
                />
              }
            />
          }
        >
          <Info aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("View audit details")}</TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{view.action}</DialogTitle>
          <DialogDescription>
            {t(
              "Names reflect current records. Original references and recorded values are shown below.",
            )}
          </DialogDescription>
        </DialogHeader>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          {[
            [t("Time"), <DateText key="time" value={log.createdAt} />],
            [t("Changed by"), view.actor],
            [view.entityType, view.entity],
            [
              t("Changes"),
              <span
                key="changes"
                className="inline-flex flex-wrap items-center gap-1.5"
              >
                {view.summary.split(" → ").map((part, index) => (
                  <Fragment key={index}>
                    {index > 0 ? (
                      <>
                        <ArrowRight
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="sr-only">{t("to")}</span>
                      </>
                    ) : null}
                    <span>{part}</span>
                  </Fragment>
                ))}
              </span>,
            ],
          ].map(([label, value], index) => (
            <div key={index} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-6 text-sm font-semibold">{t("Technical details")}</h3>
        <dl className="mt-3 space-y-3 text-sm">
          {[
            ["Audit record ID", log.id],
            ["Actor ID", log.actorId],
            ["Record ID", log.entityId],
            ["Action code", log.action],
            ["Record type", log.entityType],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{t(label!)}</dt>
              <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-5 text-sm font-semibold">{t("Recorded metadata")}</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
          {log.metadata
            ? JSON.stringify(log.metadata, null, 2)
            : t("No additional details recorded.")}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
