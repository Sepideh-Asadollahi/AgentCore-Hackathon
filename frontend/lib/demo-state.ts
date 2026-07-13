export type DemoViewState =
  | "ready"
  | "running"
  | "pending_approval"
  | "completed"
  | "degraded"
  | "failed";

const RUNNING_STATES = new Set([
  "accepted",
  "gathering_context",
  "decomposing",
  "analyzing",
  "reconciling",
]);

export function mapRunToDemoState(
  run: {state: string} | null,
  options: {apiReachable: boolean; transportError?: string},
): DemoViewState {
  if (!options.apiReachable) return "degraded";
  if (!run) return options.transportError ? "degraded" : "ready";
  if (run.state === "failed") return "failed";
  if (run.state === "completed") return "completed";
  if (run.state === "awaiting_approval") return "pending_approval";
  if (RUNNING_STATES.has(run.state)) return "running";
  return "running";
}

export function roleDisplayName(role: string): string {
  const labels: Record<string, string> = {
    coordinator: "Coordinator",
    context_scout: "Context Scout",
    change_analyst: "Change Analyst",
    impact_analyst: "Impact Analyst",
    policy_guardian: "Policy Guardian",
    frontend_delivery_lead: "Frontend Delivery",
  };
  return labels[role] ?? role.replaceAll("_", " ");
}
