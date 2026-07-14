import Link from "next/link";
import {
  RUN_DETAIL_TABS,
  type RunDetailTabId,
  runDetailTabHref,
} from "@/lib/run-detail-tabs";
import {cn} from "@/lib/utils";

type Props = {
  runId: string;
  activeTab: RunDetailTabId;
  className?: string;
};

/** Link-based tabs — works without client JavaScript (SSR). */
export function RunDetailTabBar({runId, activeTab, className}: Props) {
  return (
    <nav
      className={cn(
        "mb-4 -mx-1 flex gap-1 overflow-x-auto border-b border-border/80 pb-px scrollbar-thin",
        className,
      )}
      aria-label="Run detail views"
    >
      {RUN_DETAIL_TABS.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={runDetailTabHref(runId, tab.id)}
            title={tab.hint}
            className={cn(
              "shrink-0 rounded-t-md border border-transparent px-3 py-2.5 text-[13px] font-medium tracking-tight transition-colors",
              isActive
                ? "border-border/80 border-b-background bg-card font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
