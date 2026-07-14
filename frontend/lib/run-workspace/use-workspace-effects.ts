"use client";

import {useEffect, type MutableRefObject} from "react";
import {api, isSocietyRunNotFoundError, Scenario, SocietyRun} from "@/lib/api";
import {shouldPollSocietyRun} from "@/lib/demo-state";
import {loadWorkspaceBootstrap} from "@/lib/workspace-bootstrap";
import {recordLiveRunForScenario, type SavedRunReport, type ScenarioRunAvailability} from "@/lib/run-report-storage";
import {
  abandonStaleRunSession,
  clearAllRunSessionPointers,
  readBrowserStoredRunId,
  setRunSessionCookies,
  stripRunIdFromBrowserUrl,
} from "@/lib/run-session-cookies";
import type {RunViewSource} from "@/components/workspace/ScenarioRunPicker";
import {wsLog} from "./logger";

export type WorkspaceBootstrapEffectParams = {
  initialScenariosLength: number;
  scenarioId: string;
  evaluationRef: MutableRefObject<Record<string, unknown> | null>;
  refreshRef: MutableRefObject<(active: SocietyRun) => Promise<SocietyRun | undefined>>;
  setScenariosLoading: (loading: boolean | ((prev: boolean) => boolean)) => void;
  setApiReachable: (reachable: boolean) => void;
  setScenarios: (scenarios: Scenario[] | ((prev: Scenario[]) => Scenario[])) => void;
  setScenarioId: (id: string | ((prev: string) => string)) => void;
  setError: (message: string) => void;
  setAgents: (agents: import("@/lib/api").ManagedAgent[]) => void;
  setRuntimeLabel: (label: string | ((prev: string) => string)) => void;
  setDemoAutoApprove: (value: boolean) => void;
  setRun: (run: SocietyRun | null) => void;
  setRequestText: (text: string) => void;
  setRunViewSource: (source: RunViewSource | null) => void;
  setEvaluation: (evaluation: Record<string, unknown> | null) => void;
  bumpStorageRevision: () => void;
  refreshDbReportForScenario: (sid: string) => Promise<SavedRunReport | null>;
  applySavedReport: (saved: SavedRunReport) => void;
};

export function useWorkspaceBootstrapEffect(params: WorkspaceBootstrapEffectParams) {
  const {
    initialScenariosLength,
    scenarioId,
    evaluationRef,
    refreshRef,
    setScenariosLoading,
    setApiReachable,
    setScenarios,
    setScenarioId,
    setError,
    setAgents,
    setRuntimeLabel,
    setDemoAutoApprove,
    setRun,
    setRequestText,
    setRunViewSource,
    setEvaluation,
    bumpStorageRevision,
    refreshDbReportForScenario,
    applySavedReport,
  } = params;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.csBootstrap = "started";
      }
      setScenariosLoading(prev => prev || initialScenariosLength === 0);
      try {
        const result = await loadWorkspaceBootstrap();
        if (cancelled) return;

        if (result.scenarios.length > 0) {
          setApiReachable(true);
          setScenarios(result.scenarios);
          const first = result.scenarios[0];
          setScenarioId(prev =>
            result.scenarios.some(s => s.scenario_id === prev) ? prev : first.scenario_id,
          );
          setError("");
          setAgents(result.agents);
          setRuntimeLabel(result.runtimeLabel);
          setDemoAutoApprove(result.demoAutoApprove);
        } else {
          setScenarios(prev => (prev.length > 0 ? prev : []));
          if (initialScenariosLength === 0) {
            setApiReachable(false);
            setError(result.error ?? "API unavailable");
            setRuntimeLabel(result.runtimeLabel);
          }
        }
      } finally {
        if (!cancelled) {
          setScenariosLoading(false);
          if (typeof document !== "undefined") {
            document.documentElement.dataset.csBootstrap = "done";
          }
        }
      }

      if (cancelled) return;

      const runFromBrowser = readBrowserStoredRunId();
      if (!runFromBrowser) {
        if (!cancelled) void refreshDbReportForScenario(scenarioId);
        return;
      }

      wsLog.info("stored run id", {runId: runFromBrowser});

      try {
        const storedRun = await api.getRun(runFromBrowser);
        if (cancelled) return;
        stripRunIdFromBrowserUrl();
        setRunSessionCookies(storedRun.run_id);
        setRun(storedRun);
        setScenarioId(storedRun.scenario_id);
        setRequestText(storedRun.request_text);
        setRunViewSource("live");
        recordLiveRunForScenario(storedRun.scenario_id, storedRun.run_id);
        bumpStorageRevision();
        await refreshRef.current(storedRun);
        const report = await refreshDbReportForScenario(storedRun.scenario_id);
        if (report?.evaluation && !evaluationRef.current) setEvaluation(report.evaluation);
      } catch (err) {
        wsLog.warn("stored run invalid", {runId: runFromBrowser, message: err instanceof Error ? err.message : "unknown"});
        if (isSocietyRunNotFoundError(err)) {
          abandonStaleRunSession();
        } else {
          clearAllRunSessionPointers();
        }
        if (isSocietyRunNotFoundError(err) && !cancelled) {
          const report = await refreshDbReportForScenario(scenarioId);
          if (report) {
            applySavedReport(report);
            setRunViewSource("snapshot");
            setError("The linked run id is not on the API. Showing the latest run for this scenario from the database.");
          }
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // ponytail: run once on client mount; SSR may already have initialScenarios
  }, [initialScenariosLength]);
}

export function useInitialScenariosSync(
  initialScenarios: Scenario[],
  setScenarios: (s: Scenario[] | ((prev: Scenario[]) => Scenario[])) => void,
  setApiReachable: (v: boolean) => void,
  setScenariosLoading: (v: boolean) => void,
  setScenarioId: (id: string | ((prev: string) => string)) => void,
  setRuntimeLabel: (label: string | ((prev: string) => string)) => void,
) {
  useEffect(() => {
    if (initialScenarios.length === 0) return;
    setScenarios(prev => (prev.length > 0 ? prev : initialScenarios));
    setApiReachable(true);
    setScenariosLoading(false);
    setScenarioId(prev =>
      initialScenarios.some(s => s.scenario_id === prev) ? prev : initialScenarios[0].scenario_id,
    );
    setRuntimeLabel(prev => (prev === "connecting…" ? "Backend connected" : prev));
  }, [initialScenarios, setScenarios, setApiReachable, setScenariosLoading, setScenarioId, setRuntimeLabel]);
}

export function useDefaultRunViewSource(
  runViewSource: RunViewSource | null,
  scenarioRunAvailabilityState: ScenarioRunAvailability,
  setRunViewSource: (source: RunViewSource | null) => void,
) {
  useEffect(() => {
    if (runViewSource != null) return;
    const {snapshot, live} = scenarioRunAvailabilityState;
    if (snapshot) setRunViewSource("snapshot");
    else if (live) setRunViewSource("live");
  }, [scenarioRunAvailabilityState, runViewSource, setRunViewSource]);
}

export function useLiveRunViewSourceSync(
  run: SocietyRun | null,
  runViewSource: RunViewSource | null,
  scenarioId: string,
  setRunViewSource: (source: RunViewSource | null) => void,
) {
  useEffect(() => {
    if (run?.run_id && runViewSource == null && run.scenario_id === scenarioId) {
      setRunViewSource("live");
    }
  }, [run?.run_id, run?.scenario_id, runViewSource, scenarioId, setRunViewSource]);
}

export function useScenarioDbReportPrefetch(
  scenarioId: string,
  refreshDbReportForScenario: (sid: string) => Promise<SavedRunReport | null>,
) {
  useEffect(() => {
    void refreshDbReportForScenario(scenarioId);
  }, [scenarioId, refreshDbReportForScenario]);
}

export function useSocietyRunPolling(
  run: SocietyRun | null,
  runRef: MutableRefObject<SocietyRun | null>,
  refreshRef: MutableRefObject<(active: SocietyRun) => Promise<SocietyRun | undefined>>,
) {
  useEffect(() => {
    if (!run?.run_id || !shouldPollSocietyRun(run.state)) return;
    const tick = () => {
      const active = runRef.current;
      if (!active || !shouldPollSocietyRun(active.state)) return;
      void refreshRef.current(active);
    };
    const id = window.setInterval(tick, 2500);
    return () => window.clearInterval(id);
  }, [run?.run_id, run?.state, runRef, refreshRef]);
}

export function useAutoEvaluateCompletedRun(
  run: SocietyRun | null,
  evaluation: Record<string, unknown> | null,
  autoEvalStartedRef: MutableRefObject<string | null>,
  setEvaluation: (evaluation: Record<string, unknown> | null) => void,
) {
  useEffect(() => {
    if (!run || run.state !== "completed" || evaluation) return;
    if (autoEvalStartedRef.current === run.run_id) return;
    autoEvalStartedRef.current = run.run_id;
    const runId = run.run_id;
    let cancelled = false;
    void api
      .evaluate(runId)
      .then(result => {
        if (cancelled) return;
        setEvaluation(result);
      })
      .catch(err => {
        wsLog.warn("auto evaluate failed", {runId, message: err instanceof Error ? err.message : "unknown"});
      });
    return () => {
      cancelled = true;
    };
  }, [run?.run_id, run?.state, evaluation, autoEvalStartedRef, setEvaluation]);
}
