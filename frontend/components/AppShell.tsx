"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/animate-ui/components/radix/sidebar";
import {RouteTransition} from "@/components/app-shell/RouteTransition";
import {RunActivityBanner} from "@/components/workspace/RunActivityBanner";
import {DemoAutoApproveBanner} from "@/components/workspace/DemoAutoApproveBanner";
import {WorkspaceModals} from "@/components/workspace/WorkspaceOverlays";
import {APP_ROUTES, routeByPath, WORKSPACE_NAV_ROUTES} from "@/lib/routes";
import {statusTone, useRunWorkspace} from "@/lib/run-workspace";
import {cn} from "@/lib/utils";

function statusDotClass(tone: ReturnType<typeof statusTone>) {
  switch (tone) {
    case "done":
      return "bg-emerald-400";
    case "error":
      return "bg-red-400";
    case "active":
      return "bg-amber-400 animate-pulse";
    default:
      return "bg-zinc-500";
  }
}

export function AppShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const route = routeByPath(pathname) ?? APP_ROUTES[0];
  const {runtimeLabel, viewState} = useRunWorkspace();
  const tone = statusTone(viewState);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="icon"
        variant="inset"
        animateOnHover={false}
        className="border-sidebar-border"
      >
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <div className="flex flex-col gap-0.5 px-1 group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AgentCore
            </span>
            <span className="text-sm font-semibold text-sidebar-foreground">Change Society</span>
            <span className="text-xs text-muted-foreground truncate" title={runtimeLabel}>
              {runtimeLabel}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {WORKSPACE_NAV_ROUTES.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className="cursor-pointer">
                      <Link href={item.href} className="cursor-pointer">
                        <item.icon className="opacity-80 transition-transform duration-150 group-hover/menu-item:scale-110" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-svh bg-background">
        <header className="sticky top-0 z-20 flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm md:px-6">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{route.label}</h1>
            <p className="truncate text-xs leading-snug text-muted-foreground">{route.description}</p>
          </div>
          {viewState !== "ready" && (
            <div
              className="flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs capitalize text-muted-foreground"
              aria-live="polite"
            >
              <span className={cn("size-2 rounded-full", statusDotClass(tone))} />
              {viewState.replaceAll("_", " ")}
            </div>
          )}
        </header>
        <RunActivityBanner />
        <DemoAutoApproveBanner />
        <div className="flex-1 overflow-auto px-5 py-5 md:px-6 md:py-6 lg:px-8">
          <RouteTransition>{children}</RouteTransition>
        </div>
      </SidebarInset>
      <WorkspaceModals />
    </SidebarProvider>
  );
}
