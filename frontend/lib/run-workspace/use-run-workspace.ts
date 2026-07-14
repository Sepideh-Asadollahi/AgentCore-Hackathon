"use client";

import {useCallback, useMemo, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {
  AgentMessage,
  AgentTicket,
  api,
  Conflict,
  FrontendDelivery,
  ManagedAgent,
  Scenario,
  SocietyRun,
} from "@/lib/api";
import {mapRunToDemoState} from "@/lib/demo-state";
import type {RunLaunchPhase} from "@/lib/run-progress-steps";
import {scenarioRunAvailability} from "@/lib/run-report-storage";
import type {RunViewSource} from "@/components/workspace/ScenarioRunPicker";
import {clearActiveRunSession} from "@/lib/run-session-cookies";
import {executeRunLaunch} from "./run-launch-flow";
import {selectScenarioRunView as selectScenarioRunViewFlow} from "./select-scenario-run-view";
import type {RunWorkspaceValue, SelectScenarioRunViewOptions} from "./types";
import {useDbReportCache} from "./use-db-report-cache";
import {useRunRefreshActions} from "./use-run-refresh";
import {
  useAutoEvaluateCompletedRun,
  useDefaultRunViewSource,
  useInitialScenariosSync,
  useLiveRunViewSourceSync,
  useScenarioDbReportPrefetch,
  useSocietyRunPolling,
  useWorkspaceBootstrapEffect,
} from "./use-workspace-effects";
import {wsLog} from "./logger";

export function useRunWorkspaceState(initialScenarios: Scenario[]): RunWorkspaceValue {
  const router = useRouter();
  const hasInitial = initialScenarios.length > 0;
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [scenariosLoading, setScenariosLoading] = useState(!hasInitial);
  const [scenarioId, setScenarioId] = useState(() =>
    hasInitial ? initialScenarios[0].scenario_id : "pricing-refactor",
  );
  const selected = useMemo(() => scenarios.find(item => item.scenario_id === scenarioId), [scenarios, scenarioId]);
  const [requestText, setRequestText] = useState("");
  const [run, setRun] = useState<SocietyRun | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [agents, setAgents] = useState<ManagedAgent[]>([]);
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [frontendDelivery, setFrontendDelivery] = useState<FrontendDelivery | null>(null);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [runRefreshing, setRunRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [apiReachable, setApiReachable] = useState(hasInitial);
  const [correlationId, setCorrelationId] = useState("");
  const [runtimeLabel, setRuntimeLabel] = useState(hasInitial ? "Backend connected" : "connecting…");
  const [demoAutoApprove, setDemoAutoApprove] = useState(false);
  const [runLaunchOpen, setRunLaunchOpen] = useState(false);
  const [runLaunchPhase, setRunLaunchPhase] = useState<RunLaunchPhase>("idle");
  const [runLaunchError, setRunLaunchError] = useState<string | null>(null);
  const [runLaunchTargetRunId, setRunLaunchTargetRunId] = useState<string | null>(null);
  const [resetRunDialogOpen, setResetRunDialogOpen] = useState(false);
  const [runDetailDialogOpen, setRunDetailDialogOpen] = useState(false);
  const [runViewSource, setRunViewSource] = useState<RunViewSource | null>(null);

  const {
    dbReportsByScenario,
    setDbReportsByScenario,
    latestSavedReport,
    setLatestSavedReport,
    bumpStorageRevision,
    refreshDbReportForScenario,
    scenarioRunAvailabilityState,
  } = useDbReportCache(scenarioId);

  const evaluationRef = useRef(evaluation);
  evaluationRef.current = evaluation;
  const autoEvalStartedRef = useRef<string | null>(null);

  const refreshSetters = useMemo(
    () => ({
      setRun,
      setMessages,
      setConflicts,
      setTickets,
      setAgents,
      setFrontendDelivery,
      setEvaluation,
      setLatestSavedReport,
      setDbReportsByScenario,
      setCorrelationId,
      setScenarioId,
      setRequestText,
      setLastRefreshAt,
      setRunRefreshing,
      setError,
    }),
    [
      setRun,
      setMessages,
      setConflicts,
      setTickets,
      setAgents,
      setFrontendDelivery,
      setEvaluation,
      setLatestSavedReport,
      setDbReportsByScenario,
      setCorrelationId,
      setScenarioId,
      setRequestText,
      setLastRefreshAt,
      setRunRefreshing,
      setError,
    ],
  );

  const {applySavedReport, refresh} = useRunRefreshActions(
    refreshSetters,
    refreshDbReportForScenario,
    bumpStorageRevision,
  );

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const runRef = useRef(run);
  runRef.current = run;

  useDefaultRunViewSource(runViewSource, scenarioRunAvailabilityState, setRunViewSource);
  useLiveRunViewSourceSync(run, runViewSource, scenarioId, setRunViewSource);
  useScenarioDbReportPrefetch(scenarioId, refreshDbReportForScenario);
  useSocietyRunPolling(run, runRef, refreshRef);
  useAutoEvaluateCompletedRun(run, evaluation, autoEvalStartedRef, setEvaluation);

  useInitialScenariosSync(
    initialScenarios,
    setScenarios,
    setApiReachable,
    setScenariosLoading,
    setScenarioId,
    setRuntimeLabel,
  );

  useWorkspaceBootstrapEffect({
    initialScenariosLength: initialScenarios.length,
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
  });

  const dismissRunLaunch = useCallback(() => {
    setRunLaunchOpen(false);
    setRunLaunchPhase("idle");
    setRunLaunchError(null);
    setRunLaunchTargetRunId(null);
  }, []);

  const openRunLaunchWorkQueue = useCallback(() => {
    const runId = runLaunchTargetRunId ?? run?.run_id;
    dismissRunLaunch();
    if (runId) router.push(`/agents?run=${encodeURIComponent(runId)}&tab=guide`);
  }, [dismissRunLaunch, run?.run_id, runLaunchTargetRunId, router]);

  const viewState = mapRunToDemoState(run, {apiReachable, transportError: error || undefined});

  const selectScenarioRunView = useCallback(
    async (source: RunViewSource, options?: SelectScenarioRunViewOptions) => {
      await selectScenarioRunViewFlow(source, options, {
        scenarioId,
        run,
        dbReportsByScenario,
        refreshDbReportForScenario,
        applySavedReport,
        refresh,
        bumpStorageRevision,
        setBusy,
        setError,
        setRun,
        setScenarioId,
        setRequestText,
        setRunViewSource,
        navigate: path => router.push(path),
        replaceAgentsRunUrl: (runId, tab) =>
          router.replace(`/agents?run=${encodeURIComponent(runId)}&tab=${tab}`),
      });
    },
    [
      scenarioId,
      run,
      refresh,
      router,
      applySavedReport,
      bumpStorageRevision,
      dbReportsByScenario,
      refreshDbReportForScenario,
    ],
  );

  const start = useCallback(async () => {
    await executeRunLaunch({
      scenarioId,
      requestText,
      refresh,
      bumpStorageRevision,
      autoEvalRunIdRef: autoEvalStartedRef,
      setters: {
        setRunLaunchOpen,
        setRunLaunchPhase,
        setRunLaunchError,
        setRunLaunchTargetRunId,
        setBusy,
        setError,
        setEvaluation,
        setCorrelationId,
        setRun,
        setRunViewSource,
        setEvaluationRef: value => {
          evaluationRef.current = value;
        },
      },
    });
  }, [scenarioId, requestText, refresh, bumpStorageRevision]);

  const loadLatestDemo = useCallback(async () => {
    const {snapshot, live} = scenarioRunAvailability(scenarioId, dbReportsByScenario[scenarioId] ?? null);
    if (runViewSource === "live" && live) {
      await selectScenarioRunView("live");
      return;
    }
    if (runViewSource === "snapshot" && snapshot) {
      await selectScenarioRunView("snapshot");
      return;
    }
    if (snapshot) {
      await selectScenarioRunView("snapshot");
      return;
    }
    if (live) {
      await selectScenarioRunView("live");
      return;
    }
    setError("No run in the database or active session for this scenario yet. Use Run new demo.");
  }, [scenarioId, runViewSource, selectScenarioRunView, dbReportsByScenario]);

  const decide = useCallback(
    async (action: "approve" | "reject" | "request-changes") => {
      if (!run) return;
      setBusy(true);
      setError("");
      try {
        const updated = await api.decide(run, action, `${action} after reviewing conflict evidence.`);
        wsLog.info("decide ok", {runId: run.run_id, action, state: updated.state});
        setRun(updated);
        setCorrelationId(updated.correlation_id);
        await refresh(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Decision failed";
        wsLog.warn("decide failed", {runId: run.run_id, action, message});
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [run, refresh],
  );

  const evaluate = useCallback(async () => {
    if (!run) return;
    setBusy(true);
    try {
      const result = await api.evaluate(run.run_id);
      wsLog.info("evaluate ok", {runId: run.run_id});
      setEvaluation(result);
      const updated = await api.getRun(run.run_id);
      setRun(updated);
      void refreshDbReportForScenario(updated.scenario_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      wsLog.warn("evaluate failed", {runId: run.run_id, message});
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [run, refreshDbReportForScenario]);

  const resetRun = useCallback(() => {
    clearActiveRunSession();
    setRun(null);
    setMessages([]);
    setConflicts([]);
    setTickets([]);
    setFrontendDelivery(null);
    setEvaluation(null);
    setCorrelationId("");
    setRunViewSource(null);
    setError("");
  }, []);

  const onScenarioChange = useCallback(
    (id: string) => {
      if (!id || id === scenarioId) return;
      const accepted = scenarios.some(s => s.scenario_id === id);
      wsLog.info("scenario change requested", {
        requestedId: id,
        previousId: scenarioId,
        accepted,
        knownCount: scenarios.length,
      });
      if (!accepted) {
        wsLog.warn("scenario change rejected (id not in loaded list)", {
          requestedId: id,
          knownIds: scenarios.map(s => s.scenario_id),
        });
        return;
      }
      setScenarioId(id);
      setRequestText("");
      const avail = scenarioRunAvailability(id, dbReportsByScenario[id] ?? null);
      if (avail.snapshot && !avail.live) setRunViewSource("snapshot");
      else if (avail.live && !avail.snapshot) setRunViewSource("live");
      else if (avail.snapshot && avail.live) {
        setRunViewSource(prev => prev ?? "snapshot");
      } else {
        setRunViewSource(null);
      }
    },
    [scenarios, scenarioId, dbReportsByScenario],
  );

  const confirmResetRun = useCallback(() => {
    setResetRunDialogOpen(false);
    resetRun();
  }, [resetRun]);

  return {
    scenarios,
    scenariosLoading,
    scenarioId,
    setScenarioId,
    selected,
    requestText,
    setRequestText,
    run,
    messages,
    conflicts,
    agents,
    tickets,
    frontendDelivery,
    evaluation,
    busy,
    runRefreshing,
    lastRefreshAt,
    latestSavedReport,
    error,
    correlationId,
    runtimeLabel,
    demoAutoApprove,
    viewState,
    runLaunchOpen,
    runLaunchPhase,
    runLaunchError,
    runLaunchTargetRunId,
    dismissRunLaunch,
    openRunLaunchWorkQueue,
    resetRunDialogOpen,
    setResetRunDialogOpen,
    runDetailDialogOpen,
    setRunDetailDialogOpen,
    start,
    loadLatestDemo,
    decide,
    evaluate,
    resetRun,
    onScenarioChange,
    confirmResetRun,
    runViewSource,
    setRunViewSource,
    scenarioRunAvailability: scenarioRunAvailabilityState,
    selectScenarioRunView,
  };
}