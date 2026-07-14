import type {LucideIcon} from "lucide-react";
import {Bot, FileText, LayoutDashboard, Settings, Shield} from "lucide-react";

export type AppRouteId =
  | "overview"
  | "policy"
  | "run"
  | "agents"
  | "settings";

export type AppRoute = {
  id: AppRouteId;
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** When false, page stays routable but is omitted from the Workspace sidebar. */
  inNav?: boolean;
};

const NAV_ROUTE_IDS: AppRouteId[] = ["overview", "run", "agents", "settings"];

export const APP_ROUTES: AppRoute[] = [
  {
    id: "overview",
    href: "/overview",
    label: "Home",
    icon: LayoutDashboard,
    description: "Session status and quick context",
  },
  {
    id: "run",
    href: "/runs",
    label: "Run",
    icon: FileText,
    description: "Pick a scenario and start a society run",
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "API connection and workspace IDs",
  },
  {
    id: "policy",
    href: "/policy",
    label: "Policy",
    icon: Shield,
    description: "Policy intake and operating constraints",
    inNav: false,
  },
  {
    id: "agents",
    href: "/agents",
    label: "Work queue",
    icon: Bot,
    description: "Active run hub — queue, approve, reports, and evidence tabs",
  },
];

/** Sidebar Workspace group — three entries only. */
export const WORKSPACE_NAV_ROUTES: AppRoute[] = APP_ROUTES.filter(
  r => r.inNav !== false && NAV_ROUTE_IDS.includes(r.id),
);

export function routeByPath(pathname: string): AppRoute | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/overview";
  if (normalized === "/") return APP_ROUTES.find(r => r.id === "overview");
  return APP_ROUTES.find(r => r.href === normalized);
}
