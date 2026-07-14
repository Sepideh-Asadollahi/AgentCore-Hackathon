import {formatMetricDisplayValue} from "@/lib/metric-display";
import {wsMetricCell, wsMetricLabel, wsMetricValue} from "@/lib/workspace-ui";

export function Metric({label, value}: {label: string; value: unknown}) {
  const shown = formatMetricDisplayValue(value);
  return (
    <div className={wsMetricCell}>
      <strong className={wsMetricValue}>{shown}</strong>
      <span className={wsMetricLabel}>{label}</span>
    </div>
  );
}
