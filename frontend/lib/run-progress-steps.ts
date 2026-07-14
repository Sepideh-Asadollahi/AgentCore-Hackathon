import {explainRunState} from "@/lib/run-judge-narrative";
import {isSocietyRunLaunchSettled} from "@/lib/demo-state";

export type RunLaunchPhase =
  | "idle"
  | "posting"
  | "running"
  | "sync"
  | "report"
  | "finished"
  | "error";

export type ProgressStepStatus = "pending" | "active" | "done" | "error";

export type RunProgressStep = {
  id: string;
  headline: string;
  body: string;
  /** Society run state this row maps to; omit for client-only steps. */
  runState?: string;
};

const PIPELINE_STATES = [
  "accepted",
  "gathering_context",
  "decomposing",
  "analyzing",
  "reconciling",
  "awaiting_approval",
  "finalizing",
  "completed",
] as const;

function pipelineIndex(state: string): number {
  const idx = PIPELINE_STATES.indexOf(state as (typeof PIPELINE_STATES)[number]);
  return idx >= 0 ? idx : -1;
}

function buildPipelineSteps(): RunProgressStep[] {
  return PIPELINE_STATES.map(state => {
    const copy = explainRunState(state);
    return {
      id: state,
      runState: state,
      headline: copy.headline,
      body: copy.body,
    };
  });
}

export const RUN_PROGRESS_STEPS: RunProgressStep[] = [
  {
    id: "posting",
    headline: "Submitting society run",
    body: "Sending the selected demo scenario to the Change Society API. The coordinator will accept the request and begin specialist work.",
  },
  ...buildPipelineSteps(),
  {
    id: "sync",
    headline: "Syncing run snapshot",
    body: "Loading messages, tickets, conflicts, and managed agents so the Work queue matches the server.",
  },
  {
    id: "report",
    headline: "Building demo report",
    body: "Running baseline evaluation and saving the latest report for Load latest demo and Reports.",
  },
  {
    id: "done",
    headline: "Run ready",
    body: "The society pipeline finished. Close this dialog or open the Work queue to review evidence, conflicts, and metrics.",
  },
];

function stepRunIndex(step: RunProgressStep): number {
  if (!step.runState) return -1;
  return pipelineIndex(step.runState);
}

function clientStepStatus(
  stepId: string,
  phase: RunLaunchPhase,
  runState: string | null,
): ProgressStepStatus | null {
  const order = ["posting", "sync", "report", "done"] as const;
  const idx = order.indexOf(stepId as (typeof order)[number]);
  if (idx < 0) return null;

  const phaseOrder: Record<RunLaunchPhase, number> = {
    idle: -1,
    posting: 0,
    running: 0,
    sync: 1,
    report: 2,
    finished: 3,
    error: -1,
  };
  const current = phaseOrder[phase];
  if (phase === "error") {
    if (stepId === "posting") return "error";
    return "pending";
  }
  if (phase === "finished") return "done";
  if (current < 0) return "pending";
  if (idx < current) return "done";
  if (idx === current) return "active";
  return "pending";
}

/** Step row status for the launch progress dialog. */
export function resolveRunProgressStepStatus(
  step: RunProgressStep,
  phase: RunLaunchPhase,
  runState: string | null,
): ProgressStepStatus {
  if (step.id === "posting" || step.id === "sync" || step.id === "report" || step.id === "done") {
    const client = clientStepStatus(step.id, phase, runState);
    if (client) return client;
  }

  if (phase === "error") {
    if (step.runState && runState === step.runState) return "error";
    const runIdx = runState ? pipelineIndex(runState) : -1;
    const stepIdx = stepRunIndex(step);
    if (stepIdx >= 0 && runIdx >= 0 && stepIdx < runIdx) return "done";
    return "pending";
  }

  const stepIdx = stepRunIndex(step);
  if (stepIdx < 0) return "pending";

  if (phase === "posting") return "pending";

  const runIdx = runState ? pipelineIndex(runState) : -1;
  const failed = runState === "failed" || runState === "rejected" || runState === "canceled";

  if (failed && step.runState === runState) return "error";
  if (failed && runIdx >= 0) {
    if (stepIdx < runIdx) return "done";
    if (stepIdx === runIdx) return "error";
    return "pending";
  }

  if (runIdx < 0) {
    if (phase === "finished") return "done";
    if (phase === "running") return stepIdx === 0 ? "active" : "pending";
    return "pending";
  }

  const pipelineFrozen = phase === "sync" || phase === "report" || phase === "finished";

  if (stepIdx < runIdx) return "done";
  if (stepIdx === runIdx) {
    if (pipelineFrozen) return "done";
    if (phase === "running") return "active";
    return "done";
  }

  if (stepIdx > runIdx) {
    if (runState === "completed" && pipelineFrozen) return "done";
    if (runState === "awaiting_approval" && step.runState === "completed") return "pending";
    if (pipelineFrozen && runState === "awaiting_approval" && step.runState === "finalizing") return "pending";
    return "pending";
  }

  return "pending";
}

export function isRunLaunchBusy(phase: RunLaunchPhase): boolean {
  return phase === "posting" || phase === "running" || phase === "sync" || phase === "report";
}

export function runLaunchOutcomeLabel(runState: string | null): string {
  if (!runState) return "Waiting for the API…";
  if (runState === "completed") return "Society run completed — demo report saved when evaluation succeeded.";
  if (runState === "awaiting_approval") return "Analysis complete — human approval is required before finalize.";
  if (isSocietyRunLaunchSettled(runState)) return `Run ended (${runState.replaceAll("_", " ")}).`;
  return explainRunState(runState).headline;
}
