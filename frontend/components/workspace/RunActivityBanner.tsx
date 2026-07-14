"use client";

import Link from "next/link";
import {useRunWorkspace} from "@/lib/run-workspace";
import {explainRunState} from "@/lib/run-judge-narrative";
import {runDetailTabHref} from "@/lib/run-detail-tabs";
import {wsMeta} from "@/lib/workspace-ui";

export function RunActivityBanner() {
  const ws = useRunWorkspace();
  const run = ws.run;
  if (!run) return null;

  const narrative = explainRunState(run.state);

  const active =
    ws.busy ||
    ws.runRefreshing ||
    ws.viewState === "running" ||
    ws.viewState === "pending_approval";

  if (!active && ws.viewState !== "failed") return null;

  const lastSync =
    ws.lastRefreshAt != null
      ? new Date(ws.lastRefreshAt).toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit", second: "2-digit"})
      : "—";

  return (
    <div
      className="border-b border-border/80 bg-card/60 px-4 py-3 md:px-6"
      role="status"
      aria-live="polite"
      aria-busy={ws.runRefreshing || ws.viewState === "running"}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{narrative.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {(ws.runRefreshing || ws.viewState === "running") && (
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <span className="size-2 animate-pulse rounded-full bg-amber-400" />
            {narrative.headline}
          </span>
        )}
        {ws.viewState === "pending_approval" && (
          <span className="font-medium text-amber-100">{narrative.headline}</span>
        )}
        {ws.viewState === "failed" && <span className="font-medium text-red-300">Run failed</span>}
        <span className="text-muted-foreground">
          State: <span className="font-mono text-xs text-foreground">{run.state}</span>
        </span>
        <span className="text-muted-foreground">
          Messages: <span className="text-foreground">{ws.messages.length}</span> · Tickets:{" "}
          <span className="text-foreground">{ws.tickets.length}</span>
        </span>
        <span className={wsMeta}>Last sync {lastSync}</span>
        {ws.viewState === "running" && ws.tickets.length === 0 && (
          <span className="text-xs text-amber-100/90">
            Tickets appear as agents start work — counters should update every few seconds.
          </span>
        )}
        {ws.viewState === "pending_approval" && (
          <Link
            href={runDetailTabHref(run.run_id, "approve")}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Open Review tab
          </Link>
        )}
        {ws.viewState === "completed" && (
          <Link
            href={runDetailTabHref(run.run_id, "reports")}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View Results tab
          </Link>
        )}
      </div>
    </div>
  );
}
