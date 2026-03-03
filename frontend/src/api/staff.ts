import { request } from "./core";

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
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export function staffLogin(login: string, password: string, otpCode?: string): Promise<StaffLoginResponse> {
  const payload: Record<string, string> = { login, password };
  if (otpCode) payload.otp_code = otpCode;
  return request<StaffLoginResponse>("/staff/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postStaffRefresh(refreshToken: string): Promise<StaffLoginResponse> {
  return request<StaffLoginResponse>("/staff/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
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
