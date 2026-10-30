import type { ComponentType, SVGProps } from "react";
import {
  House,
  Store,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Settings,
  MapPin,
  ShieldCheck,
  Bell,
  ChartNoAxesCombined,
  Layers,
  UserRound,
  ClipboardList,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";

export type Role = UserRole;
export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  SHOP_OWNER: "Shop owner",
  ADMIN: "Administrator",
  DELIVERY_PERSON: "Delivery person",
};
export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  CUSTOMER: "/account",
  SHOP_OWNER: "/owner",
  ADMIN: "/admin",
  DELIVERY_PERSON: "/delivery",
};
export type NavGroupId =
  "overview" | "shopping" | "shop" | "delivery" | "administration" | "account";
export interface NavItem {
  id: string;
  label: string;
  href: string;
  group: NavGroupId;
  roles: Role[];
  exact?: boolean;
}
export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: NavItem[];
}
const ALL_ROLES: Role[] = [
  "CUSTOMER",
  "SHOP_OWNER",
  "ADMIN",
  "DELIVERY_PERSON",
];
const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "shopping", label: "Shopping" },
  { id: "shop", label: "Shop management" },
  { id: "delivery", label: "Deliveries" },
  { id: "administration", label: "Administration" },
  { id: "account", label: "Account" },
];
export const NAV_ITEMS: NavItem[] = [
  {
    id: "customerDashboard",
    label: "Dashboard",
    href: "/account",
    group: "overview",
    roles: ["CUSTOMER"],
    exact: true,
  },
  {
    id: "ownerDashboard",
    label: "Dashboard",
    href: "/owner",
    group: "overview",
    roles: ["SHOP_OWNER"],
    exact: true,
  },
  {
    id: "adminDashboard",
    label: "Dashboard",
    href: "/admin",
    group: "overview",
    roles: ["ADMIN"],
    exact: true,
  },
  {
    id: "deliveryDashboard",
    label: "Dashboard",
    href: "/delivery",
    group: "overview",
    roles: ["DELIVERY_PERSON"],
    exact: true,
  },
  {
    id: "products",
    label: "Browse products",
    href: "/products",
    group: "shopping",
    roles: ["CUSTOMER"],
  },
  {
    id: "cart",
    label: "Cart",
    href: "/cart",
    group: "shopping",
    roles: ["CUSTOMER"],
  },
  {
    id: "customerOrders",
    label: "My orders",
    href: "/account/orders",
    group: "shopping",
    roles: ["CUSTOMER"],
  },
  {
    id: "ownerOrders",
    label: "Orders",
    href: "/owner/orders",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "ownerProducts",
    label: "Products",
    href: "/owner/products",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "categories",
    label: "Categories",
    href: "/owner/categories",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "ownerDelivery",
    label: "Delivery personnel",
    href: "/owner/delivery-personnel",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/owner/reports",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "settings",
    label: "Shop settings",
    href: "/owner/settings",
    group: "shop",
    roles: ["SHOP_OWNER"],
  },
  {
    id: "availableOrders",
    label: "Available orders",
    href: "/delivery/orders",
    group: "delivery",
    roles: ["DELIVERY_PERSON"],
  },
  {
    id: "batches",
    label: "Active batches",
    href: "/delivery/batches",
    group: "delivery",
    roles: ["DELIVERY_PERSON"],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    group: "administration",
    roles: ["ADMIN"],
  },
  {
    id: "shops",
    label: "Shops",
    href: "/admin/shops",
    group: "administration",
    roles: ["ADMIN"],
  },
  {
    id: "adminDelivery",
    label: "Delivery personnel",
    href: "/admin/delivery-personnel",
    group: "administration",
    roles: ["ADMIN"],
  },
  {
    id: "auditLogs",
    label: "Audit logs",
    href: "/admin/audit-logs",
    group: "administration",
    roles: ["ADMIN"],
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    group: "account",
    roles: ALL_ROLES,
  },
  {
    id: "profile",
    label: "Profile",
    href: "/account/profile",
    group: "account",
    roles: ["CUSTOMER"],
  },
  {
    id: "addresses",
    label: "Addresses",
    href: "/account/addresses",
    group: "account",
    roles: ["CUSTOMER"],
  },
  {
    id: "security",
    label: "Security",
    href: "/account/security",
    group: "account",
    roles: ["CUSTOMER"],
  },
];
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && Object.hasOwn(ROLE_LABELS, value);
}
export function navigationPath(pathname: string): string {
  return pathname.replace(/^\/(en|si)(?=\/|$)/, "").replace(/\/$/, "") || "/";
}
export function isNavItemActive(
  pathname: string,
  href: string,
  exact = false,
): boolean {
  const path = navigationPath(pathname);
  if (path === href || (!exact && path.startsWith(`${href}/`))) return true;
  return (
    href === "/products" &&
    (path === "/categories" || path.startsWith("/categories/"))
  );
}
export function getNavItemsForRole(
  role: Role | string | null | undefined,
): NavItem[] {
  return isRole(role)
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : [];
}
export function getNavGroupsForRole(
  role: Role | string | null | undefined,
): NavGroup[] {
  const items = getNavItemsForRole(role);
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}
/** UI checks complement the server page guards and API authorization. */
export function canAccessWorkspace(
  role: Role | null,
  pathname: string,
): boolean {
  if (!isRole(role)) return false;
  const path = navigationPath(pathname);
  if (["/dashboard", "/profile", "/notifications"].includes(path)) return true;
  const roots: Record<Role, string[]> = {
    CUSTOMER: [
      "/account",
      "/orders",
      "/cart",
      "/checkout",
      "/products",
      "/categories",
    ],
    SHOP_OWNER: ["/owner"],
    ADMIN: ["/admin"],
    DELIVERY_PERSON: ["/delivery"],
  };
  return roots[role].some((root) => isNavItemActive(path, root));
}
export const ICONS_MAP: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  customerDashboard: House,
  ownerDashboard: House,
  adminDashboard: House,
  deliveryDashboard: House,
  products: Store,
  cart: ShoppingCart,
  customerOrders: ClipboardList,
  ownerOrders: ClipboardList,
  ownerProducts: Package,
  categories: Layers,
  ownerDelivery: Truck,
  reports: ChartNoAxesCombined,
  settings: Settings,
  availableOrders: Package,
  batches: Truck,
  users: Users,
  shops: Store,
  adminDelivery: Truck,
  auditLogs: ShieldCheck,
  notifications: Bell,
  profile: UserRound,
  addresses: MapPin,
  security: ShieldCheck,
};
export default NAV_ITEMS;
