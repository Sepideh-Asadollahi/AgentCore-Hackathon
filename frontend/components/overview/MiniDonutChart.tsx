import type {ReportBar} from "@/lib/home-reporting";
import {cn} from "@/lib/utils";
import {wsChartEmpty} from "@/lib/workspace-ui";

const SLICE_COLORS = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee"];

type MiniDonutChartProps = {
  title: string;
  caption?: string;
  data: ReportBar[];
  emptyLabel?: string;
  className?: string;
};

export function MiniDonutChart({title, caption, data, emptyLabel = "No slices to display.", className}: MiniDonutChartProps) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const hasData = total > 0;

  let cursor = 0;
  const gradientStops = data.map((row, index) => {
    const slice = (row.value / total) * 100;
    const start = cursor;
    cursor += slice;
    return `${SLICE_COLORS[index % SLICE_COLORS.length]} ${start}% ${cursor}%`;
  });

  return (
    <figure className={cn("flex flex-col gap-3", className)} aria-label={title}>
      <figcaption>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {caption ? <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p> : null}
      </figcaption>
      {!hasData ? (
        <p className={wsChartEmpty}>{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="relative size-28 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(${gradientStops.join(", ")})`,
            }}
            role="img"
            aria-label={`${title} distribution`}
          >
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-card text-center">
              <span className="text-lg font-semibold tabular-nums text-foreground">{total}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">total</span>
            </div>
          </div>
          <ul className="min-w-[9rem] flex-1 space-y-1.5 text-xs" role="list">
            {data.map((row, index) => (
              <li key={row.label} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length]}}
                    aria-hidden
                  />
                  <span className="truncate" title={row.label}>
                    {row.label}
                  </span>
                </span>
                <span className="tabular-nums text-foreground">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
