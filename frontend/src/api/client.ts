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
    throw new Error(getErrorMessage(err.detail ?? err));
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
  if (!res.ok) throw new Error(getErrorMessage(data.detail ?? data));
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
  company_details: Record<string, unknown> | null;
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
}

/** POST /chat/message — get assistant reply. */
export function sendChatMessage(body: ChatMessageIn): Promise<ChatMessageOut> {
  return request<ChatMessageOut>("/chat/message", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
