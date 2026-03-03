/** User roles (marketplace). Must match backend UserRole enum. */

export const ROLE_GUEST = "guest";
export const ROLE_USER = "user";
export const ROLE_FARMER = "farmer";
export const ROLE_VENDOR = "vendor";
export const ROLE_ADMIN = "admin";

export const USER_ROLES = [ROLE_GUEST, ROLE_USER, ROLE_FARMER, ROLE_VENDOR, ROLE_ADMIN] as const;

/** Roles allowed for RequireRole on vendor routes. */
export const VENDOR_AND_ADMIN_ROLES: string[] = [ROLE_ADMIN, ROLE_VENDOR];

/** Role required for /admin (marketplace admin only; staff uses separate flow). */
export const ADMIN_ROLE: string[] = [ROLE_ADMIN];
