import {cn} from "./utils";

/** Shared workspace layout primitives (Tailwind — no legacy CSS). */

export const wsPanel =
  "ws-surface-elevated w-full min-w-0 rounded-xl border border-border/80 bg-card p-5 shadow-none md:p-6";
export const wsStep =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90";
export const wsPanelTitle = "text-lg font-semibold tracking-tight text-foreground md:text-xl";
export const wsLead = "mt-2 max-w-none text-[15px] leading-relaxed text-muted-foreground";
export const wsGridSingle = "grid w-full min-w-0 gap-5";
export const wsPage = "flex w-full min-w-0 max-w-none flex-col gap-6";
export const wsEmpty =
  "rounded-lg bg-muted/25 px-4 py-10 text-center text-sm leading-relaxed text-muted-foreground";
export const wsChartEmpty =
  "rounded-lg bg-muted/25 px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground";
export const wsMeta = "mt-2 block text-xs leading-relaxed text-muted-foreground";
export const wsMetaRow =
  "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground/90";
export const wsFieldLabel = "mb-2 block text-xs font-medium text-muted-foreground";
export const wsFieldControl =
  "mt-1.5 block w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] disabled:opacity-50";
export const wsMetricsGrid = "grid grid-cols-2 gap-3";
export const wsMetricCell =
  "ws-surface-metric rounded-xl border border-border/80 bg-background px-4 py-4";
export const wsMetricValue =
  "block text-2xl font-semibold tabular-nums tracking-tight text-foreground";
export const wsMetricLabel = "mt-1 block text-xs font-medium text-muted-foreground";
export const wsMessages = "max-h-[480px] overflow-auto pr-1";
export const wsMessageRow = "border-b border-border py-3";
export const wsMessageSummary =
  "grid cursor-pointer grid-cols-[28px_1fr_1fr_auto] items-center gap-2 text-sm transition-colors hover:text-foreground";
export const wsBadge =
  "rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground";
export const wsConflict = "border-l-2 border-amber-600/80 py-1 pl-3.5";
export const wsPre =
  "max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground";
export const wsAlertError =
  "mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive";
export const wsAlertWarn =
  "mb-4 rounded-lg border border-amber-600/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200";
export const wsActions = "mt-5 flex flex-wrap gap-2.5";

export function panelClass(...extra: (string | undefined)[]) {
  return cn(wsPanel, ...extra);
}
