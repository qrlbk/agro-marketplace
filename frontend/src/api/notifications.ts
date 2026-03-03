import { request } from "./core";
import type { Notification } from "./types";

export type { Notification } from "./types";

export function getNotifications(
  token: string,
  params?: { limit?: number; offset?: number; unread_only?: boolean }
): Promise<Notification[]> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.unread_only) search.set("unread_only", "true");
  const q = search.toString();
  return request<Notification[]>(`/notifications${q ? `?${q}` : ""}`, { token });
}

export function getUnreadNotificationsCount(token: string): Promise<{ count: number }> {
  return request<{ count: number }>("/notifications/unread-count", { token });
}

export function markNotificationRead(notificationId: number, token: string): Promise<Notification> {
  return request<Notification>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}
