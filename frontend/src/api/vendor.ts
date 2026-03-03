import { request } from "./core";
import type { AuditLogOut } from "./admin";

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

export type { AuditLogOut } from "./admin";

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
