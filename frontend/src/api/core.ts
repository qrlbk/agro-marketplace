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

/** Set by auth layer. On 401, client may call these to get a new access token and retry. */
let authRefresher: (() => Promise<string | null>) | null = null;
let staffAuthRefresher: (() => Promise<string | null>) | null = null;
export function setAuthRefresher(fn: (() => Promise<string | null>) | null): void {
  authRefresher = fn;
}
export function setStaffAuthRefresher(fn: (() => Promise<string | null>) | null): void {
  staffAuthRefresher = fn;
}

export async function request<T>(
  path: string,
  options: RequestInit & { token?: string; _retried?: boolean } = {}
): Promise<T> {
  const { token, _retried, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...rest, headers });
  if (res.status === 401 && token && !_retried) {
    const newToken = (await authRefresher?.()) ?? (await staffAuthRefresher?.());
    if (newToken) return request<T>(path, { ...rest, token: newToken, _retried: true });
  }
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
