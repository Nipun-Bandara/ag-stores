import type { ComponentType, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * The three things a table body can be other than data: still loading, empty,
 * or failed. Every screen used to spell these out inline, which is why some
 * showed a spinner, some the word "Loading..." and some nothing at all.
 */

interface SkeletonRowsProps {
  /** Must match the real header count, or the columns shift while loading. */
  columns: number;
  rows?: number;
}

export function TableSkeletonRows({ columns, rows = 4 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="border-border">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={columnIndex} className="py-4 px-6">
              {/* Staggered widths read as text rather than as a loading bar */}
              <Skeleton className={columnIndex === 0 ? "h-4 w-28" : "h-4 w-20"} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface EmptyStateProps {
  columns: number;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function TableEmptyState({
  columns,
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="h-48">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="p-3 rounded-full bg-muted text-muted-foreground">
            <Icon className="w-6 h-6" />
          </div>
          <p className="text-base font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md">{description}</p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface ErrorStateProps {
  columns: number;
  message: string;
  onRetry: () => void;
}

export function TableErrorState({ columns, message, onRetry }: ErrorStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="h-48">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-base font-medium text-destructive max-w-md">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
