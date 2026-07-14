import {api, isSocietyRunNotFoundError, SocietyRun} from "@/lib/api";
import {
  isSocietyRunLaunchSettled,
  shouldPollDuringRunLaunch,
} from "@/lib/demo-state";
import type {RunLaunchPhase} from "@/lib/run-progress-steps";
import {recordLiveRunForScenario} from "@/lib/run-report-storage";
import {setRunSessionCookies} from "@/lib/run-session-cookies";
import {wsLog} from "./logger";

export type RunLaunchSetters = {
  setRunLaunchOpen: (open: boolean) => void;
  setRunLaunchPhase: (phase: RunLaunchPhase) => void;
  setRunLaunchError: (message: string | null) => void;
  setRunLaunchTargetRunId: (runId: string | null) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  setEvaluation: (evaluation: Record<string, unknown> | null) => void;
  setCorrelationId: (id: string) => void;
  setRun: (run: SocietyRun | null) => void;
  setRunViewSource: (source: "live" | "snapshot" | null) => void;
  setEvaluationRef: (value: Record<string, unknown> | null) => void;
};

export type RunLaunchParams = {
  scenarioId: string;
  requestText: string;
  setters: RunLaunchSetters;
  refresh: (active: SocietyRun) => Promise<SocietyRun | undefined>;
  bumpStorageRevision: () => void;
  autoEvalRunIdRef: {current: string | null};
};

export async function executeRunLaunch({
  scenarioId,
  requestText,
  setters,
  refresh,
  bumpStorageRevision,
  autoEvalRunIdRef,
}: RunLaunchParams): Promise<void> {
  wsLog.info("run start", {scenarioId, requestLen: requestText.length});
  setters.setRunLaunchOpen(true);
  setters.setRunLaunchPhase("posting");
  setters.setRunLaunchError(null);
  setters.setRunLaunchTargetRunId(null);
  setters.setBusy(true);
  setters.setError("");
  setters.setEvaluation(null);
  setters.setCorrelationId("");
  try {
    const created = await api.createRun(scenarioId, requestText.trim() || null);
    wsLog.info("run created", {runId: created.run_id, state: created.state, correlationId: created.correlation_id});
    setRunSessionCookies(created.run_id);
    setters.setRun(created);
    setters.setRunViewSource("live");
    recordLiveRunForScenario(created.scenario_id, created.run_id);
    bumpStorageRevision();
    setters.setCorrelationId(created.correlation_id);

    setters.setRunLaunchPhase("running");
    let latest = created;
    const deadline = Date.now() + 120_000;
    while (shouldPollDuringRunLaunch(latest.state) && Date.now() < deadline) {
      await new Promise(resolve => window.setTimeout(resolve, 900));
      latest = await api.getRun(latest.run_id);
      setters.setRun(latest);
    }

    if (!isSocietyRunLaunchSettled(latest.state)) {
      throw new Error("Timed out waiting for the society run to finish. Check API logs and try again.");
    }

    if (latest.state === "failed" || latest.state === "rejected" || latest.state === "canceled") {
      setters.setRunLaunchError(`Run ended in state: ${latest.state.replaceAll("_", " ")}.`);
      setters.setRunLaunchPhase("error");
      setters.setError(`Run ended in state: ${latest.state}.`);
      setters.setRunLaunchTargetRunId(latest.run_id);
      return;
    }

    setters.setRunLaunchPhase("sync");
    const afterSync = await refresh(latest);
    if (afterSync) latest = afterSync;

    if (latest.state === "completed") {
      setters.setRunLaunchPhase("report");
      try {
        autoEvalRunIdRef.current = latest.run_id;
        const evalResult = await api.evaluate(latest.run_id);
        setters.setEvaluation(evalResult);
        setters.setEvaluationRef(evalResult);
        const afterReport = await refresh(latest);
        if (afterReport) latest = afterReport;
      } catch (err) {
        wsLog.warn("launch evaluate failed", {
          runId: latest.run_id,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    setters.setRunLaunchTargetRunId(latest.run_id);
    setters.setRunLaunchPhase("finished");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Run failed";
    wsLog.error("run failed", {message});
    setters.setRunLaunchError(message);
    setters.setRunLaunchPhase("error");
    setters.setError(message);
  } finally {
    setters.setBusy(false);
  }
}
