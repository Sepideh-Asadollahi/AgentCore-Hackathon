import {api, type SocietyRun} from "@/lib/api";
import {isSocietyRunNotFoundError} from "@/lib/api";
import type {SavedRunReport} from "@/lib/run-report-storage";

function baselineEvaluationFromRun(run: SocietyRun): Record<string, unknown> | null {
  const metrics = run.metrics ?? {};
  const stored = metrics.baseline_evaluation;
  if (stored && typeof stored === "object") return stored as Record<string, unknown>;
  return null;
}

/** Load the latest persisted society run for a demo scenario from the API (database-backed store). */
export async function fetchSavedRunReportForScenario(scenarioId: string): Promise<SavedRunReport | null> {
  if (!scenarioId) return null;
  try {
    const run = await api.latestRunForScenario(scenarioId);
    const [messages, conflicts, tickets, agents] = await Promise.all([
      api.messages(run.run_id),
      api.conflicts(run.run_id),
      api.tickets(run.run_id),
      api.agents(),
    ]);
    return {
      savedAt: run.updated_at ?? new Date().toISOString(),
      run,
      messages,
      tickets,
      conflicts,
      agents,
      evaluation: baselineEvaluationFromRun(run),
    };
  } catch (err) {
    if (isSocietyRunNotFoundError(err)) return null;
    throw err;
  }
}
