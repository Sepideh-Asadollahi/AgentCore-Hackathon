import {api, isSocietyRunNotFoundError, SocietyRun} from "@/lib/api";
import {
  recordLiveRunForScenario,
  scenarioRunAvailability,
  type SavedRunReport,
} from "@/lib/run-report-storage";
import {abandonStaleRunSession, setRunSessionCookies} from "@/lib/run-session-cookies";
import type {RunViewSource} from "@/components/workspace/ScenarioRunPicker";
import {wsLog} from "./logger";
import type {SelectScenarioRunViewOptions} from "./types";

export type SelectScenarioRunViewDeps = {
  scenarioId: string;
  run: SocietyRun | null;
  dbReportsByScenario: Record<string, SavedRunReport>;
  refreshDbReportForScenario: (sid: string) => Promise<SavedRunReport | null>;
  applySavedReport: (saved: SavedRunReport) => void;
  refresh: (active: SocietyRun) => Promise<SocietyRun | undefined>;
  bumpStorageRevision: () => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  setRun: (run: SocietyRun | null) => void;
  setScenarioId: (id: string) => void;
  setRequestText: (text: string) => void;
  setRunViewSource: (source: RunViewSource | null) => void;
  navigate: (path: string) => void;
  replaceAgentsRunUrl: (runId: string, tab: string) => void;
};

export async function selectScenarioRunView(
  source: RunViewSource,
  options: SelectScenarioRunViewOptions | undefined,
  deps: SelectScenarioRunViewDeps,
): Promise<void> {
  const sid = options?.scenarioId?.trim() || deps.scenarioId;
  const navigateToAgents = options?.navigateToAgents !== false;
  const syncAgentsUrl = (runId: string) => {
    if (navigateToAgents || typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab") ?? "guide";
    deps.replaceAgentsRunUrl(runId, tab);
  };
  wsLog.info("select scenario run view", {scenarioId: sid, source});
  deps.setBusy(true);
  deps.setError("");
  try {
    if (source === "snapshot") {
      let snapshot: SavedRunReport | null = deps.dbReportsByScenario[sid] ?? null;
      if (!snapshot) snapshot = await deps.refreshDbReportForScenario(sid);
      if (!snapshot) {
        deps.setError("No run stored in the database for this scenario yet. Use Run new demo.");
        return;
      }
      deps.applySavedReport(snapshot);
      deps.setRunViewSource("snapshot");
      setRunSessionCookies(snapshot.run.run_id);
      syncAgentsUrl(snapshot.run.run_id);
      if (navigateToAgents) deps.navigate(`/agents?run=${encodeURIComponent(snapshot.run.run_id)}&tab=guide`);
      return;
    }

    const liveId = scenarioRunAvailability(sid, deps.dbReportsByScenario[sid] ?? null).live?.runId ?? null;
    let runId = liveId;
    if (!runId && deps.run?.scenario_id === sid) runId = deps.run.run_id;

    if (!runId) {
      deps.setError("No live run linked for this scenario yet. Use Run new demo.");
      return;
    }

    try {
      const storedRun = await api.getRun(runId);
      if (storedRun.scenario_id !== sid) {
        deps.setError("The linked live run belongs to another scenario. Run new demo for this scenario.");
        return;
      }
      setRunSessionCookies(runId);
      deps.setRun(storedRun);
      deps.setScenarioId(storedRun.scenario_id);
      deps.setRequestText(storedRun.request_text);
      deps.setRunViewSource("live");
      recordLiveRunForScenario(sid, runId);
      deps.bumpStorageRevision();
      await deps.refresh(storedRun);
      syncAgentsUrl(runId);
      if (navigateToAgents) deps.navigate(`/agents?run=${encodeURIComponent(runId)}&tab=guide`);
    } catch (err) {
      if (isSocietyRunNotFoundError(err)) {
        const snapshot = await deps.refreshDbReportForScenario(sid);
        if (snapshot) {
          abandonStaleRunSession();
          deps.applySavedReport(snapshot);
          deps.setRunViewSource("snapshot");
          deps.setError("This live run is not on the API. Showing the latest run for this scenario from the database.");
          if (navigateToAgents) deps.navigate(`/agents?run=${encodeURIComponent(snapshot.run.run_id)}&tab=guide`);
          else syncAgentsUrl(snapshot.run.run_id);
          return;
        }
        abandonStaleRunSession();
      }
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open run for this scenario";
    wsLog.warn("select scenario run view failed", {scenarioId: sid, source, message});
    deps.setError(message);
  } finally {
    deps.setBusy(false);
  }
}
