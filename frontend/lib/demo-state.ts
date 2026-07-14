export type DemoViewState =
  | "ready"
  | "running"
  | "pending_approval"
  | "completed"
  | "degraded"
  | "failed";

export type StatusTone = "idle" | "active" | "done" | "error";

export function statusTone(viewState: string): StatusTone {
  if (viewState === "completed") return "done";
  if (viewState === "failed" || viewState === "degraded") return "error";
  if (viewState === "ready") return "idle";
  return "active";
}

const RUNNING_STATES = new Set([
  "accepted",
  "gathering_context",
  "decomposing",
  "analyzing",
  "reconciling",
]);

export function shouldPollSocietyRun(state: string): boolean {
  return RUNNING_STATES.has(state);
}

/** Poll during Run launch until the society reaches a user-visible outcome. */
export function shouldPollDuringRunLaunch(state: string): boolean {
  return RUNNING_STATES.has(state) || state === "finalizing";
}

export function isSocietyRunLaunchSettled(state: string): boolean {
  return (
    state === "completed" ||
    state === "awaiting_approval" ||
    state === "failed" ||
    state === "rejected" ||
    state === "canceled"
  );
}

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

/** Plain label for run.state in UI copy (technical id stays in mono where needed). */
export function humanRunStateLabel(state: string): string {
  const labels: Record<string, string> = {
    accepted: "Accepted — queued to start",
    gathering_context: "Gathering evidence",
    decomposing: "Breaking work into tasks",
    analyzing: "Specialists analyzing",
    reconciling: "Merging specialist answers",
    awaiting_approval: "Waiting for your approval",
    finalizing: "Wrapping up",
    completed: "Completed",
    failed: "Failed",
  };
  return labels[state] ?? state.replaceAll("_", " ");
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
