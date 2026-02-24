export const API = import.meta.env.VITE_API_URL ?? "/api";

/** URL для отображения фото товара (подставляет базовый адрес API для относительных путей). */
export function productImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API}${url.startsWith("/") ? url : "/" + url}`;
}

/** Normalize FastAPI error detail (string or list of strings/objects) to a single message. */
export function getErrorMessage(detail: unknown): string {
  if (detail == null) return "Ошибка";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((x) => (typeof x === "object" && x != null && "msg" in x ? (x as { msg: string }).msg : String(x)));
    return parts.join(" ") || "Ошибка";
  }
  if (typeof detail === "object" && "detail" in (detail as object)) return getErrorMessage((detail as { detail: unknown }).detail);
  return String(detail);
}

export async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const message = getErrorMessage(err.detail ?? err);
    const e = new Error(message) as Error & { isForbidden?: boolean; status?: number };
    e.isForbidden = res.status === 403;
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function uploadFile<T = unknown>(path: string, file: File, token: string): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(API + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(getErrorMessage(data.detail ?? data)) as Error & { isForbidden?: boolean };
    e.isForbidden = res.status === 403;
    throw e;
  }
  return data as T;
}

/** Загрузить фото товара. Возвращает URL для сохранения в product.images. */
export async function uploadProductImage(file: File, token: string): Promise<string> {
  const data = await uploadFile<{ url: string }>("/vendor/upload-image", file, token);
  return data.url;
}

export interface User {
  id: number;
  role: string;
  phone: string;
  name: string | null;
  region?: string | null;
  company_id?: number | null;
  company_details: Record<string, unknown> | null;
  company_status?: string | null;
  company_role?: string | null; // "owner" | "manager" | "warehouse" | "sales" for vendor
}

export interface BinLookupResult {
  name: string | null;
  legal_address: string | null;
  chairman_name: string | null;
  manual_input_required?: boolean;
}

export interface OnboardingBody {
  role: "user" | "farmer" | "vendor";
  name?: string | null;
  region?: string | null;
  bin?: string | null;
  company_name?: string | null;
  legal_address?: string | null;
  chairman_name?: string | null;
  bank_iik?: string | null;
  bank_bik?: string | null;
  contact_name?: string | null;
}

/** List of regions of Kazakhstan (single source of truth from backend). */
export function getRegions(): Promise<string[]> {
  return request<string[]>("/regions");
}

export function getBinLookup(bin: string, token: string): Promise<BinLookupResult> {
  const params = new URLSearchParams({ bin: bin.replace(/\D/g, "") });
  return request<BinLookupResult>(`/auth/bin-lookup?${params}`, { token });
}

export function postOnboarding(body: OnboardingBody, token: string): Promise<User> {
  return request<User>("/auth/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export interface ProfileUpdateBody {
  name?: string | null;
  region?: string | null;
}

export function patchAuthMe(body: ProfileUpdateBody, token: string): Promise<User> {
  return request<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export interface Product {
  id: number;
  vendor_id: number;
  category_id: number | null;
  category_slug?: string | null;
  name: string;
  article_number: string;
  price: number;
  stock_quantity: number;
  description: string | null;
  characteristics?: Record<string, string> | null;
  composition?: string | null;
  images: string[] | null;
  status: string;
  average_rating?: number | null;
  reviews_count?: number;
}

export interface Review {
  id: number;
  user_id: number;
  author_display: string;
  rating: number;
  text: string | null;
  created_at: string;
}

export interface ProductReviewsResponse {
  items: Review[];
  total_count: number;
  average_rating: number | null;
}

export interface VendorRating {
  average_rating: number;
  total_reviews: number;
}

export function getProductReviews(
  productId: number,
  params?: { limit?: number; offset?: number }
): Promise<ProductReviewsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<ProductReviewsResponse>(`/products/${productId}/reviews${q ? `?${q}` : ""}`);
}

export function postProductReview(
  productId: number,
  body: { rating: number; text?: string | null },
  token: string
): Promise<ProductReviewsResponse> {
  return request<ProductReviewsResponse>(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function getVendorRating(vendorId: number): Promise<VendorRating> {
  return request<VendorRating>(`/vendors/${vendorId}/rating`);
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

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

export interface ProductList {
  items: Product[];
  total: number;
  suggested_terms?: string[] | null;
}

export interface Machine {
  id: number;
  brand: string;
  model: string;
  year: number | null;
}

export interface GarageItem {
  id: number;
  user_id: number;
  machine_id: number;
  serial_number: string | null;
  moto_hours: number | null;
  brand?: string;
  model?: string;
  year?: number | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_order: number;
  name?: string | null;
  article_number?: string | null;
}

export interface Order {
  id: number;
  order_number?: string | null;
  user_id: number;
  vendor_id: number;
  total_amount: number;
  status: string;
  delivery_address: string | null;
  comment: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
}

export interface CategoryTree {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  children: CategoryTree[];
}

export async function getCategoryTree(): Promise<CategoryTree[]> {
  return request<CategoryTree[]>("/categories/tree");
}

export interface CartItem {
  product_id: number;
  quantity: number;
  vendor_id: number;
  price: number;
  name: string;
  article_number: string;
}

/** AI maintenance: one kit recommendation (e.g. 500h service). */
export interface MaintenanceRecommendation {
  interval_h: number | null;
  items: string[];
  reason: string;
}

/** AI maintenance advice for one garage machine. */
export interface MaintenanceAdvice {
  garage_id: number;
  machine_id: number;
  brand: string;
  model: string;
  year: number | null;
  moto_hours: number | null;
  recommendations: MaintenanceRecommendation[];
  error_message?: string | null;
}

export interface SearchSuggest {
  original_query: string;
  suggestions: string[];
  expanded_terms: string[];
}

export interface RecommendationOut {
  product_id: number;
  name: string;
  article_number: string;
  price: number;
  category_name: string | null;
  message: string;
}

/** AI compatibility check result (POST /products/check-compatibility). */
export interface CompatibilityVerification {
  compatible: boolean;
  confidence: number;
  reason: string;
}

/** POST /products/check-compatibility — AI check if product fits machine. */
export function checkCompatibility(body: { product_id: number; machine_id: number }): Promise<CompatibilityVerification> {
  return request<CompatibilityVerification>("/products/check-compatibility", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** GET /recommendations — cross-sell product recommendations. */
export function getRecommendations(token: string): Promise<RecommendationOut[]> {
  return request<RecommendationOut[]>("/recommendations", { token });
}

/** GET /recommendations/maintenance — AI maintenance advice per garage machine. */
export function getMaintenanceAdvice(token: string): Promise<MaintenanceAdvice[]> {
  return request<MaintenanceAdvice[]>("/recommendations/maintenance", { token });
}

/** GET /search/suggest?q=... — Smart Search synonyms and expanded terms. */
export function getSearchSuggest(q: string): Promise<SearchSuggest> {
  const params = new URLSearchParams({ q: q.trim() });
  return request<SearchSuggest>(`/search/suggest?${params}`);
}

/** Chat assistant (no auth). */
export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface ChatMessageIn {
  message: string;
  history: ChatHistoryItem[];
}

export interface ChatMessageOut {
  reply: string;
  suggested_catalog_url?: string | null;
}

/** GET /health/openai — проверка OpenAI: ключ задан и API отвечает. */
export interface OpenAIHealth {
  key_set: boolean;
  ok?: boolean;
  error?: string;
  reply?: string;
}

export function getOpenAIHealth(): Promise<OpenAIHealth> {
  return request<OpenAIHealth>("/health/openai");
}

/** POST /chat/message — get assistant reply. Pass token when user is logged in for garage context and catalog link. */
export function sendChatMessage(
  body: ChatMessageIn,
  token?: string | null
): Promise<ChatMessageOut> {
  return request<ChatMessageOut>("/chat/message", {
    method: "POST",
    body: JSON.stringify(body),
    ...(token ? { token } : {}),
  });
}

const CHAT_STREAM_TIMEOUT_MS = 60000;

export interface ChatStreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (suggestedCatalogUrl: string | null) => void;
  onError: (message: string) => void;
}

/**
 * POST /chat/message/stream — stream assistant reply via SSE.
 * Calls onChunk for each content delta, onDone(suggestedCatalogUrl) at end, onError on failure or timeout.
 * Returns AbortController so caller can abort (e.g. Stop button).
 */
export function sendChatMessageStream(
  body: ChatMessageIn,
  token: string | null | undefined,
  callbacks: ChatStreamCallbacks
): { abort: () => void } {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => {
    ac.abort();
    callbacks.onError("Превышено время ожидания ответа. Попробуйте ещё раз.");
  }, CHAT_STREAM_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  fetch(API + "/chat/message/stream", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: ac.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        callbacks.onError(getErrorMessage(err.detail ?? err));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onDone(null);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const block of lines) {
            const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const data = JSON.parse(dataLine.slice(6)) as {
                content?: string;
                done?: boolean;
                suggested_catalog_url?: string | null;
              };
              if (data.content != null) callbacks.onChunk(data.content);
              if (data.done) {
                callbacks.onDone(data.suggested_catalog_url ?? null);
                return;
              }
            } catch {
              /* skip malformed event */
            }
          }
        }
        callbacks.onDone(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          callbacks.onError("Запрос отменён.");
        } else {
          callbacks.onError("Помощник временно недоступен. Попробуйте позже.");
        }
      }
    })
    .catch(() => {
      callbacks.onError("Не удалось подключиться к бэкенду. Запущен ли сервер (порт 8000)?");
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });

  return {
    abort: () => {
      clearTimeout(timeoutId);
      ac.abort();
    },
  };
}

/** Feedback (support) — optional auth; if anonymous, contact_phone is required. */
export interface FeedbackCreate {
  subject: string;
  message: string;
  contact_phone?: string | null;
  order_id?: number | null;
  product_id?: number | null;
}

export interface FeedbackOut {
  id: number;
  message?: string;
}

export function postFeedback(body: FeedbackCreate, token?: string | null): Promise<FeedbackOut> {
  return request<FeedbackOut>("/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    ...(token ? { token } : {}),
  });
}

// --- Admin API (all require admin token) ---

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

export interface FeedbackTicketAdminOut {
  id: number;
  user_id: number | null;
  user_phone: string | null;
  user_name: string | null;
  subject: string;
  message: string;
  contact_phone: string | null;
  status: string;
  admin_notes: string | null;
  order_id: number | null;
  order_number: string | null;
  product_id: number | null;
  product_name: string | null;
  created_at: string;
  updated_at: string;
}

export function getAdminFeedback(
  token: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<FeedbackTicketAdminOut[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<FeedbackTicketAdminOut[]>(`/admin/feedback${q ? `?${q}` : ""}`, { token });
}

export function getAdminFeedbackTicket(ticketId: number, token: string): Promise<FeedbackTicketAdminOut> {
  return request<FeedbackTicketAdminOut>(`/admin/feedback/${ticketId}`, { token });
}

export function patchAdminFeedback(
  ticketId: number,
  body: { status?: string; admin_notes?: string | null; send_reply?: string | null },
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

// --- Vendor team ---
export type CompanyRole = "owner" | "manager" | "warehouse" | "sales";

export interface TeamMemberOut {
  user_id: number;
  phone: string;
  name: string | null;
  company_role: CompanyRole;
  invited_by_id: number | null;
  created_at: string;
}

export function getVendorTeam(token: string): Promise<TeamMemberOut[]> {
  return request<TeamMemberOut[]>("/vendor/team", { token });
}

export function postVendorTeamInvite(
  body: { phone: string; company_role: CompanyRole },
  token: string
): Promise<{ user_id: number; phone: string; company_role: string }> {
  return request("/vendor/team/invite", { method: "POST", body: JSON.stringify(body), token });
}

export function patchVendorTeamMemberRole(
  userId: number,
  body: { company_role: CompanyRole },
  token: string
): Promise<{ user_id: number; company_role: string }> {
  return request(`/vendor/team/${userId}/role`, { method: "PATCH", body: JSON.stringify(body), token });
}

export function deleteVendorTeamMember(userId: number, token: string): Promise<void> {
  return request(`/vendor/team/${userId}`, { method: "DELETE", token });
}

// --- Audit log ---
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

export function getVendorAuditLog(
  token: string,
  params?: { limit?: number; offset?: number; action?: string }
): Promise<{ items: AuditLogOut[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.action) search.set("action", params.action);
  const q = search.toString();
  return request<{ items: AuditLogOut[]; total: number }>(`/vendor/audit-log${q ? `?${q}` : ""}`, { token });
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

// --- Staff portal API (login/password, separate from marketplace auth) ---

export interface StaffRole {
  id: number;
  name: string;
  slug: string;
}

export interface StaffMe {
  id: number;
  login: string;
  name: string | null;
  role: StaffRole;
  permissions: string[];
  is_active: boolean;
}

export interface StaffLoginResponse {
  access_token: string;
  token_type: string;
}

export function staffLogin(login: string, password: string): Promise<StaffLoginResponse> {
  return request<StaffLoginResponse>("/staff/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function staffMe(token: string): Promise<StaffMe> {
  return request<StaffMe>("/staff/me", { token });
}

export function staffChangePassword(
  token: string,
  body: { current_password: string; new_password: string }
): Promise<void> {
  return request<void>("/staff/me/change-password", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

/** Order number for display (when backend adds it). */
export interface AdminOrderOutWithNumber extends AdminOrderOut {
  order_number?: string | null;
}

// --- Staff employees & roles (require staff token) ---

export interface StaffEmployeeOut {
  id: number;
  login: string;
  name: string | null;
  role_id: number;
  role_name: string;
  role_slug: string;
  is_active: boolean;
  created_at: string;
}

export interface StaffPermissionOut {
  id: number;
  code: string;
  name: string;
}

export interface StaffRoleOut {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
  permission_codes: string[];
}

export function getStaffEmployees(token: string): Promise<StaffEmployeeOut[]> {
  return request<StaffEmployeeOut[]>("/staff/employees", { token });
}

export function postStaffEmployee(
  token: string,
  body: { login: string; name?: string | null; role_id: number; password: string; is_active?: boolean }
): Promise<StaffEmployeeOut> {
  return request<StaffEmployeeOut>("/staff/employees", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function patchStaffEmployee(
  token: string,
  employeeId: number,
  body: { name?: string | null; role_id?: number; is_active?: boolean; new_password?: string | null }
): Promise<StaffEmployeeOut> {
  return request<StaffEmployeeOut>(`/staff/employees/${employeeId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export function getStaffPermissions(token: string): Promise<StaffPermissionOut[]> {
  return request<StaffPermissionOut[]>("/staff/permissions", { token });
}

export function getStaffRoles(token: string): Promise<StaffRoleOut[]> {
  return request<StaffRoleOut[]>("/staff/roles", { token });
}

export function postStaffRole(
  token: string,
  body: { name: string; slug: string; permission_ids: number[] }
): Promise<StaffRoleOut> {
  return request<StaffRoleOut>("/staff/roles", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function patchStaffRole(
  token: string,
  roleId: number,
  body: { name?: string | null; slug?: string | null; permission_ids?: number[] }
): Promise<StaffRoleOut> {
  return request<StaffRoleOut>(`/staff/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}
