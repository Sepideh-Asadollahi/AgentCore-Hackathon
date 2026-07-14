import type {AgentMessage, AgentTicket, Conflict, ManagedAgent, SocietyRun} from "@/lib/api";

export type SavedRunReport = {
  savedAt: string;
  run: SocietyRun;
  messages: AgentMessage[];
  tickets: AgentTicket[];
  conflicts: Conflict[];
  agents: ManagedAgent[];
  evaluation: Record<string, unknown> | null;
};

export type ScenarioLiveRunPointer = {
  runId: string;
  updatedAt: string;
};

export type ScenarioRunAvailability = {
  scenarioId: string;
  /** Latest run for this scenario loaded from the API / database. */
  snapshot: SavedRunReport | null;
  live: ScenarioLiveRunPointer | null;
};

export function shouldPersistSocietyRunReport(state: string): boolean {
  return state === "completed" || state === "failed" || state === "awaiting_approval";
}

/** In-memory live run pointer per scenario (session only — not localStorage). */
const liveByScenario = new Map<string, ScenarioLiveRunPointer>();

export function recordLiveRunForScenario(scenarioId: string, runId: string): void {
  if (!scenarioId || !runId) return;
  liveByScenario.set(scenarioId, {runId, updatedAt: new Date().toISOString()});
}

export function getLiveRunIdForScenario(scenarioId: string): string | null {
  if (!scenarioId) return null;
  return liveByScenario.get(scenarioId)?.runId ?? null;
}

export function scenarioRunAvailability(
  scenarioId: string,
  dbReport: SavedRunReport | null,
): ScenarioRunAvailability {
  return {
    scenarioId,
    snapshot: dbReport,
    live: liveByScenario.get(scenarioId) ?? null,
  };
}
