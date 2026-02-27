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
  { path: "/dashboard", label: "Дашборд", permission: "dashboard.view", icon: LayoutDashboard },
  { path: "/users", label: "Пользователи", permission: "users.view", icon: Users },
  { path: "/orders", label: "Заказы", permission: "orders.view", icon: ShoppingBag },
  { path: "/vendors", label: "Поставщики", permission: "vendors.view", icon: Truck },
  { path: "/feedback", label: "Обращения", permission: "feedback.view", icon: MessageSquare },
  { path: "/audit", label: "Журнал действий", permission: "audit.view", icon: FileText },
  { path: "/search", label: "Поиск", permission: "search.view", icon: Search },
  { path: "/employees", label: "Сотрудники", permission: "staff.manage", icon: UserCog },
  { path: "/roles", label: "Роли", permission: "roles.manage", icon: Shield },
];

/** Разделы только для Staff (нет в админке). */
export const STAFF_ONLY_NAV: BackofficeNavItem[] = [
  { path: "/employees", label: "Сотрудники", permission: "staff.manage", icon: UserCog },
  { path: "/roles", label: "Роли", permission: "roles.manage", icon: Shield },
];

/** Для админки: все разделы кроме staff-only. */
export function getAdminNavItems(): BackofficeNavItem[] {
  return BACKOFFICE_NAV.filter((item) => !["staff.manage", "roles.manage"].includes(item.permission));
}

/** Для Staff: фильтр по правам. */
export function getStaffNavItems(hasPermission: (p: string) => boolean): BackofficeNavItem[] {
  return BACKOFFICE_NAV.filter((item) => hasPermission(item.permission));
}
