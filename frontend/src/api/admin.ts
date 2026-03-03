import { request } from "./core";
import type { Order, User } from "./types";

export type { User } from "./types";

export interface AdminOrderOut extends Order {
  user_phone?: string | null;
  vendor_phone?: string | null;
}

export interface AdminDashboard {
  total_orders: number;
  total_revenue: number;
  by_status: Record<string, number>;
  recent_orders: AdminOrderOut[];
  recent_users: { id: number; phone: string; name: string | null; role: string }[];
  pending_vendors_count: number;
  open_feedback_count: number;
  recent_reviews: { review_id: number; product_id: number; product_name: string; rating: number; created_at: string }[];
}

export function getAdminDashboard(token: string): Promise<AdminDashboard> {
  return request<AdminDashboard>("/admin/dashboard", { token });
}

export interface AdminSearchResult {
  users: { id: number; phone: string; name: string | null }[];
  orders: { id: number; order_number?: string | null }[];
  products: { id: number; name: string; article_number: string }[];
  companies: { id: number; bin: string; name: string | null }[];
  feedback: { id: number; subject: string }[];
}

export function getAdminSearch(q: string, token: string): Promise<AdminSearchResult> {
  const params = new URLSearchParams({ q: q.trim() });
  return request<AdminSearchResult>(`/admin/search?${params}`, { token });
}

export function getAdminUser(userId: number, token: string): Promise<User> {
  return request<User>(`/admin/users/${userId}`, { token });
}

export function getAdminOrders(
  token: string,
  params?: { status?: string; order_number?: string; user_id?: number; vendor_id?: number; limit?: number; offset?: number }
): Promise<AdminOrderOut[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.order_number?.trim()) search.set("order_number", params.order_number.trim());
  if (params?.user_id != null) search.set("user_id", String(params.user_id));
  if (params?.vendor_id != null) search.set("vendor_id", String(params.vendor_id));
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<AdminOrderOut[]>(`/admin/orders${q ? `?${q}` : ""}`, { token });
}

export function getAdminOrder(orderId: number, token: string): Promise<AdminOrderOut> {
  return request<AdminOrderOut>(`/admin/orders/${orderId}`, { token });
}

export interface FeedbackMessageOut {
  id: number;
  ticket_id: number;
  sender_type: string;
  sender_user_id: number | null;
  sender_staff_id: number | null;
  message: string;
  created_at: string;
}

export interface FeedbackTicketAdminOut {
  id: number;
  user_id: number | null;
  user_phone: string | null;
  user_name: string | null;
  subject: string;
  message: string;
  contact_phone: string | null;
  status: string;
  priority: string;
  category: string | null;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  admin_notes: string | null;
  order_id: number | null;
  order_number: string | null;
  product_id: number | null;
  product_name: string | null;
  created_at: string;
  updated_at: string;
  messages?: FeedbackMessageOut[];
  overdue?: boolean;
}

export interface ReplyTemplateOut {
  id: number;
  name: string;
  body: string;
}

export function getAdminFeedback(
  token: string,
  params?: {
    status?: string;
    user_id?: number;
    assigned_to_me?: boolean;
    overdue?: boolean;
    unanswered?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: FeedbackTicketAdminOut[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.user_id != null) search.set("user_id", String(params.user_id));
  if (params?.assigned_to_me) search.set("assigned_to_me", "true");
  if (params?.overdue) search.set("overdue", "true");
  if (params?.unanswered) search.set("unanswered", "true");
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<{ items: FeedbackTicketAdminOut[]; total: number }>(`/admin/feedback${q ? `?${q}` : ""}`, { token });
}

export function getAdminReplyTemplates(token: string): Promise<ReplyTemplateOut[]> {
  return request<ReplyTemplateOut[]>("/admin/feedback/reply-templates", { token });
}

export function getAdminFeedbackTicket(ticketId: number, token: string): Promise<FeedbackTicketAdminOut> {
  return request<FeedbackTicketAdminOut>(`/admin/feedback/${ticketId}`, { token });
}

export function patchAdminFeedback(
  ticketId: number,
  body: {
    status?: string;
    priority?: string | null;
    category?: string | null;
    assigned_to_id?: number | null;
    admin_notes?: string | null;
    send_reply?: string | null;
  },
  token: string
): Promise<FeedbackTicketAdminOut> {
  return request<FeedbackTicketAdminOut>(`/admin/feedback/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export function postAdminSendNotification(
  body: { user_id: number; message: string },
  token: string
): Promise<{ message: string; user_id: number }> {
  return request<{ message: string; user_id: number }>("/admin/notifications/send", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export interface AuditLogOut {
  id: number;
  user_id: number | null;
  user_phone: string | null;
  user_name: string | null;
  company_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function getAdminAuditLog(
  token: string,
  params?: { company_id?: number; user_id?: number; action?: string; limit?: number; offset?: number }
): Promise<{ items: AuditLogOut[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.company_id != null) search.set("company_id", String(params.company_id));
  if (params?.user_id != null) search.set("user_id", String(params.user_id));
  if (params?.action) search.set("action", params.action ?? "");
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<{ items: AuditLogOut[]; total: number }>(`/admin/audit-log${q ? `?${q}` : ""}`, { token });
}
