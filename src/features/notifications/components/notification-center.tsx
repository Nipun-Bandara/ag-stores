"use client";

import Link from "next/link";
import { useState } from "react";

import type { NotificationType, UserRole } from "@/generated/prisma/client";
import type { NotificationCenterView } from "@/services/notification.service";

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

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
      setError("Unable to mark the notification as read.");
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
      setError("Unable to mark all notifications as read.");
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
            Recent notifications
          </h2>
          <p
            data-testid="notification-unread-count"
            className="mt-1 text-sm text-neutral-500"
          >
            {unreadCount} unread
          </p>
        </div>
        <button
          type="button"
          disabled={markingAll || unreadCount === 0}
          onClick={markAllRead}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {markingAll ? "Updating…" : "Mark all as read"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notifications.length ? (
        <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-white">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              data-testid="notification-item"
              className={`p-5 ${notification.readAt ? "" : "bg-blue-50/60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{notification.title}</h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {dateFormatter.format(new Date(notification.createdAt))}
                  </p>
                </div>
                {!notification.readAt ? (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900">
                    Unread
                  </span>
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
                  View related order
                </Link>
                {!notification.readAt ? (
                  <button
                    type="button"
                    disabled={pendingId === notification.id}
                    onClick={() => markRead(notification.id)}
                  >
                    {pendingId === notification.id
                      ? "Updating…"
                      : "Mark as read"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-neutral-600">
          You do not have any notifications yet.
        </p>
      )}
    </section>
  );
}
