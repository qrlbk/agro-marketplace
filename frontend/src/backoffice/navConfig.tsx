import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Truck,
  MessageSquare,
  FileText,
  Search,
  UserCog,
  Shield,
} from "lucide-react";
import {
  PERMISSION_DASHBOARD_VIEW,
  PERMISSION_USERS_VIEW,
  PERMISSION_ORDERS_VIEW,
  PERMISSION_VENDORS_VIEW,
  PERMISSION_FEEDBACK_VIEW,
  PERMISSION_AUDIT_VIEW,
  PERMISSION_SEARCH_VIEW,
  PERMISSION_STAFF_MANAGE,
  PERMISSION_ROLES_MANAGE,
} from "../constants/permissions";

/**
 * Единая конфигурация разделов бэк-офиса.
 * Навигация строится по этому списку; видимость в Staff портале — по permission.
 * В админке отображаются все разделы.
 */
export interface BackofficeNavItem {
  path: string;
  label: string;
  permission: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const BACKOFFICE_NAV: BackofficeNavItem[] = [
  { path: "/dashboard", label: "Дашборд", permission: PERMISSION_DASHBOARD_VIEW, icon: LayoutDashboard },
  { path: "/users", label: "Пользователи", permission: PERMISSION_USERS_VIEW, icon: Users },
  { path: "/orders", label: "Заказы", permission: PERMISSION_ORDERS_VIEW, icon: ShoppingBag },
  { path: "/vendors", label: "Поставщики", permission: PERMISSION_VENDORS_VIEW, icon: Truck },
  { path: "/feedback", label: "Обращения", permission: PERMISSION_FEEDBACK_VIEW, icon: MessageSquare },
  { path: "/audit", label: "Журнал действий", permission: PERMISSION_AUDIT_VIEW, icon: FileText },
  { path: "/search", label: "Поиск", permission: PERMISSION_SEARCH_VIEW, icon: Search },
  { path: "/employees", label: "Сотрудники", permission: PERMISSION_STAFF_MANAGE, icon: UserCog },
  { path: "/roles", label: "Роли", permission: PERMISSION_ROLES_MANAGE, icon: Shield },
];

/** Разделы только для Staff (нет в админке). */
export const STAFF_ONLY_NAV: BackofficeNavItem[] = [
  { path: "/employees", label: "Сотрудники", permission: PERMISSION_STAFF_MANAGE, icon: UserCog },
  { path: "/roles", label: "Роли", permission: PERMISSION_ROLES_MANAGE, icon: Shield },
];

/** Для админки: все разделы кроме staff-only. */
export function getAdminNavItems(): BackofficeNavItem[] {
  return BACKOFFICE_NAV.filter(
    (item) => ![PERMISSION_STAFF_MANAGE, PERMISSION_ROLES_MANAGE].includes(item.permission)
  );
}

/** Для Staff: фильтр по правам. */
export function getStaffNavItems(hasPermission: (p: string) => boolean): BackofficeNavItem[] {
  return BACKOFFICE_NAV.filter((item) => hasPermission(item.permission));
}
