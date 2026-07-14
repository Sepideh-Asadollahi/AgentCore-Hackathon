/** Display formatting for workspace metric cells (unit-tested). */
export function formatMetricDisplayValue(value: unknown): string {
  if (typeof value === "number" && value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
  return String(value ?? "—");
}
