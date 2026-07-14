import type {ReportBar} from "@/lib/home-reporting";
import {cn} from "@/lib/utils";
import {wsChartEmpty} from "@/lib/workspace-ui";

const BAR_COLORS = ["bg-sky-500/90", "bg-emerald-500/90", "bg-violet-500/90", "bg-amber-500/90", "bg-rose-500/90", "bg-cyan-500/90"];

type MiniBarChartProps = {
  title: string;
  caption?: string;
  data: ReportBar[];
  maxValue?: number;
  valueSuffix?: string;
  emptyLabel?: string;
  className?: string;
};

export function MiniBarChart({
  title,
  caption,
  data,
  maxValue,
  valueSuffix = "",
  emptyLabel = "No data yet for this chart.",
  className,
}: MiniBarChartProps) {
  const peak = maxValue ?? Math.max(1, ...data.map(row => row.value));
  const hasData = data.some(row => row.value > 0);

  return (
    <figure className={cn("flex flex-col gap-3", className)} aria-label={title}>
      <figcaption>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {caption ? <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p> : null}
      </figcaption>
      {!hasData ? (
        <p className={wsChartEmpty}>{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5" role="list">
          {data.map((row, index) => {
            const widthPct = Math.max(4, Math.round((row.value / peak) * 100));
            return (
              <li
                key={`${row.label}-${index}`}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-xs sm:gap-4"
              >
                <span className="truncate text-muted-foreground" title={row.label}>
                  {row.label}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-300", BAR_COLORS[index % BAR_COLORS.length])}
                    style={{width: `${widthPct}%`}}
                    role="presentation"
                  />
                </div>
                <span className="tabular-nums text-foreground">
                  {row.value}
                  {valueSuffix}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
