/** Staff permission codes. Must match backend app.constants.permissions. */

export const PERMISSION_DASHBOARD_VIEW = "dashboard.view";
export const PERMISSION_ORDERS_VIEW = "orders.view";
export const PERMISSION_ORDERS_EDIT = "orders.edit";
export const PERMISSION_VENDORS_VIEW = "vendors.view";
export const PERMISSION_VENDORS_APPROVE = "vendors.approve";
export const PERMISSION_FEEDBACK_VIEW = "feedback.view";
export const PERMISSION_FEEDBACK_EDIT = "feedback.edit";
export const PERMISSION_USERS_VIEW = "users.view";
export const PERMISSION_USERS_EDIT = "users.edit";
export const PERMISSION_AUDIT_VIEW = "audit.view";
export const PERMISSION_SEARCH_VIEW = "search.view";
export const PERMISSION_STAFF_MANAGE = "staff.manage";
export const PERMISSION_ROLES_MANAGE = "roles.manage";

export const ALL_PERMISSIONS: string[] = [
  PERMISSION_DASHBOARD_VIEW,
  PERMISSION_ORDERS_VIEW,
  PERMISSION_ORDERS_EDIT,
  PERMISSION_VENDORS_VIEW,
  PERMISSION_VENDORS_APPROVE,
  PERMISSION_FEEDBACK_VIEW,
  PERMISSION_FEEDBACK_EDIT,
  PERMISSION_USERS_VIEW,
  PERMISSION_USERS_EDIT,
  PERMISSION_AUDIT_VIEW,
  PERMISSION_SEARCH_VIEW,
  PERMISSION_STAFF_MANAGE,
  PERMISSION_ROLES_MANAGE,
];
