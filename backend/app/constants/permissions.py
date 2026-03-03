"""Staff permission codes. Single source of truth for require_admin_or_staff and staff dependencies.
When adding a new permission: add constant here, use in routers, add migration/seed, update frontend constants."""

PERMISSION_DASHBOARD_VIEW = "dashboard.view"
PERMISSION_ORDERS_VIEW = "orders.view"
PERMISSION_ORDERS_EDIT = "orders.edit"
PERMISSION_VENDORS_VIEW = "vendors.view"
PERMISSION_VENDORS_APPROVE = "vendors.approve"
PERMISSION_FEEDBACK_VIEW = "feedback.view"
PERMISSION_FEEDBACK_EDIT = "feedback.edit"
PERMISSION_USERS_VIEW = "users.view"
PERMISSION_USERS_EDIT = "users.edit"
PERMISSION_AUDIT_VIEW = "audit.view"
PERMISSION_SEARCH_VIEW = "search.view"
PERMISSION_STAFF_MANAGE = "staff.manage"
PERMISSION_ROLES_MANAGE = "roles.manage"

ALL_PERMISSION_CODES = [
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
]
