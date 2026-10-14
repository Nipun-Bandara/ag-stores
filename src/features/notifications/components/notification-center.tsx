"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { formatLocaleDate, translateOrderNotification } from "@/lib/i18n/text";
import { Text } from "@/features/i18n/components/text";

import Link from "next/link";
import { useState } from "react";

import type { NotificationType, UserRole } from "@/generated/prisma/client";
import type { NotificationCenterView } from "@/services/notification.service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function notificationHref(
  role: UserRole,
  type: NotificationType,
  orderId: string,
) {
  if (role === "CUSTOMER") return `/account/orders/${orderId}`;
  if (role === "SHOP_OWNER") return `/owner/orders/${orderId}`;
  if (role === "DELIVERY_PERSON") {
    return type === "ORDER_READY_FOR_DELIVERY"
      ? "/delivery/orders"
      : "/delivery/batches";
  }
  return "/admin";
}

export function NotificationCenter({
  role,
  initialData,
}: {
  role: UserRole;
  initialData: NotificationCenterView;
}) {
  const t = useText();
  const locale = useLocale();
  const [notifications, setNotifications] = useState(initialData.notifications);
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount);
  const [pendingId, setPendingId] = useState<string>();
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string>();

  async function markRead(notificationId: string) {
    setPendingId(notificationId);
    setError(undefined);
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("Unable to mark the notification as read."));
    } else {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId && !notification.readAt
            ? { ...notification, readAt }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setPendingId(undefined);
  }

  async function markAllRead() {
    setMarkingAll(true);
    setError(undefined);
    const response = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("Unable to mark all notifications as read."));
    } else {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
      setUnreadCount(0);
    }
    setMarkingAll(false);
  }

  return (
    <section className="mt-8" aria-labelledby="notification-list-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="notification-list-heading" className="text-lg font-semibold">
            <Text value={"Recent notifications "} />
          </h2>
          <p
            data-testid="notification-unread-count"
            className="mt-1 text-sm text-muted-foreground"
          >
            {unreadCount} <Text value={"unread "} />
          </p>
        </div>
        <Button
          variant="outline"
          type="button"
          disabled={markingAll || unreadCount === 0}
          onClick={markAllRead}
        >
          {markingAll ? t("Updating…") : t("Mark all as read")}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      {notifications.length ? (
        <Card className="gap-0 py-0 mt-4 divide-y overflow-hidden">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              data-testid="notification-item"
              className={`p-5 ${notification.readAt ? "" : "bg-primary/5"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{t(notification.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {translateOrderNotification(
                      locale,
                      notification.message,
                      notification.orderId,
                    )}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatLocaleDate(locale, notification.createdAt)}
                  </p>
                </div>
                {!notification.readAt ? (
                  <Badge variant="info">
                    <Text value={t("Unread")} />
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                <Link
                  href={notificationHref(
                    role,
                    notification.type,
                    notification.orderId,
                  )}
                  className="underline"
                >
                  <Text value={"View related order "} />
                </Link>
                {!notification.readAt ? (
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={pendingId === notification.id}
                    onClick={() => markRead(notification.id)}
                  >
                    {pendingId === notification.id
                      ? t("Updating…")
                      : t("Mark as read")}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </Card>
      ) : (
        <Card
          as="p"
          className="gap-0 mt-4 border-dashed p-6 text-sm text-muted-foreground border ring-0"
        >
          <Text value={"You do not have any notifications yet. "} />
        </Card>
      )}
    </section>
  );
}
