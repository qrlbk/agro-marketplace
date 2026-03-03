import { request } from "./core";
import type { User, TokenOut, BinLookupResult, OnboardingBody, ProfileUpdateBody } from "./types";

export type { User, TokenOut, BinLookupResult, OnboardingBody, ProfileUpdateBody };

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

export function patchAuthMe(body: ProfileUpdateBody, token: string): Promise<User> {
  return request<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export function loginWithPassword(phone: string, password: string): Promise<TokenOut> {
  return request<TokenOut>("/auth/login-password", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export function postAuthRefresh(refreshToken: string): Promise<TokenOut> {
  return request<TokenOut>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function postLogout(accessToken: string, refreshToken?: string | null): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/logout", {
    method: "POST",
    token: accessToken,
    body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
  });
}

export function setUserPassword(
  token: string,
  body: { current_password?: string | null; new_password: string }
): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/set-password", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}
