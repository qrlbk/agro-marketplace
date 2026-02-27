export const API = import.meta.env.VITE_API_URL ?? "/api";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Normalize FastAPI error detail (string or list of strings/objects) to a single message. */
export function getErrorMessage(detail: unknown): string {
  if (detail == null) return "Ошибка";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((x) =>
      isObject(x) && "msg" in x ? String((x as { msg: unknown }).msg) : String(x),
    );
    return parts.join(" ") || "Ошибка";
  }
  if (isObject(detail) && "detail" in detail) {
    // FastAPI style: {"detail": "..."} or {"detail": [...errors]}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getErrorMessage((detail as any).detail);
  }
  return String(detail);
}

export async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(API + path, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const message = getErrorMessage((err as { detail?: unknown }).detail ?? err);
    const e = new Error(message) as Error & { status?: number; isForbidden?: boolean };
    e.status = res.status;
    e.isForbidden = res.status === 403;
    throw e;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface User {
  id: number;
  role: "guest" | "user" | "farmer" | "vendor" | "admin";
  phone: string;
  name: string | null;
  region?: string | null;
  company_id?: number | null;
  company_details: Record<string, unknown> | null;
  company_status?: string | null;
  company_role?: string | null;
  chat_storage_opt_in?: boolean;
  has_password?: boolean;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
}

export async function getMe(token: string): Promise<User> {
  return request<User>("/auth/me", { token });
}

export function loginWithPassword(phone: string, password: string): Promise<TokenOut> {
  return request<TokenOut>("/auth/login-password", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
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

export function postOnboarding(body: OnboardingBody, token: string): Promise<User> {
  return request<User>("/auth/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function setUserPassword(
  token: string,
  body: { current_password?: string | null; new_password: string },
): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/set-password", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function getRegions(): Promise<string[]> {
  return request<string[]>("/regions");
}

