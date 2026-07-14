"use client";

import {useCallback, type Dispatch, type SetStateAction} from "react";
import {
  AgentMessage,
  AgentTicket,
  api,
  Conflict,
  FrontendDelivery,
  isSocietyRunNotFoundError,
  ManagedAgent,
  SocietyRun,
} from "@/lib/api";
import {recordLiveRunForScenario, shouldPersistSocietyRunReport, type SavedRunReport} from "@/lib/run-report-storage";
import {abandonStaleRunSession, setRunSessionCookies} from "@/lib/run-session-cookies";
import {wsLog} from "./logger";

export type RunRefreshSetters = {
  setRun: (run: SocietyRun | null) => void;
  setMessages: (messages: AgentMessage[]) => void;
  setConflicts: (conflicts: Conflict[]) => void;
  setTickets: (tickets: AgentTicket[]) => void;
  setAgents: (agents: ManagedAgent[] | ((prev: ManagedAgent[]) => ManagedAgent[])) => void;
  setFrontendDelivery: (delivery: FrontendDelivery | null) => void;
  setEvaluation: (evaluation: Record<string, unknown> | null) => void;
  setLatestSavedReport: (report: SavedRunReport | null) => void;
  setDbReportsByScenario: Dispatch<SetStateAction<Record<string, SavedRunReport>>>;
  setCorrelationId: (id: string) => void;
  setScenarioId: (id: string) => void;
  setRequestText: (text: string) => void;
  setLastRefreshAt: (at: number | null) => void;
  setRunRefreshing: (refreshing: boolean) => void;
  setError: (message: string) => void;
};

export function useRunRefreshActions(
  setters: RunRefreshSetters,
  refreshDbReportForScenario: (sid: string) => Promise<SavedRunReport | null>,
  bumpStorageRevision: () => void,
) {
  const discardMissingRun = useCallback(
    (runId: string) => {
      wsLog.warn("discard missing run", {runId});
      abandonStaleRunSession();
      setters.setRun(null);
      setters.setMessages([]);
      setters.setConflicts([]);
      setters.setTickets([]);
      setters.setFrontendDelivery(null);
      setters.setEvaluation(null);
      setters.setCorrelationId("");
    },
    [setters],
  );

  const applySavedReport = useCallback(
    (saved: SavedRunReport) => {
      setters.setRun(saved.run);
      setters.setMessages(saved.messages);
      setters.setTickets(saved.tickets);
      setters.setConflicts(saved.conflicts);
      setters.setEvaluation(saved.evaluation);
      setters.setLatestSavedReport(saved);
      setters.setDbReportsByScenario(prev => ({...prev, [saved.run.scenario_id]: saved}));
      setters.setCorrelationId(saved.run.correlation_id);
      setters.setScenarioId(saved.run.scenario_id);
      setters.setRequestText(saved.run.request_text);
      setters.setAgents(prev => (prev.length > 0 ? prev : saved.agents));
    },
    [setters],
  );

  const refresh = useCallback(
    async (active: SocietyRun) => {
      wsLog.debug("refresh", {runId: active.run_id, state: active.state});
      setters.setRunRefreshing(true);
      try {
        const [allMessages, allConflicts, allTickets, allAgents, latest, delivery] = await Promise.all([
          api.messages(active.run_id),
          api.conflicts(active.run_id),
          api.tickets(active.run_id),
          api.agents(),
          api.getRun(active.run_id),
          api.frontendDelivery(active.run_id).catch(() => null),
        ]);
        setters.setRun(latest);
        setters.setMessages(allMessages);
        setters.setConflicts(allConflicts);
        setters.setTickets(allTickets);
        setters.setAgents(allAgents);
        setters.setFrontendDelivery(delivery);
        setRunSessionCookies(latest.run_id);
        setters.setLastRefreshAt(Date.now());
        wsLog.debug("refresh ok", {runId: latest.run_id, state: latest.state, messages: allMessages.length});

        if (shouldPersistSocietyRunReport(latest.state)) {
          void refreshDbReportForScenario(latest.scenario_id);
          wsLog.info("scenario run persisted on API", {runId: latest.run_id, scenarioId: latest.scenario_id, state: latest.state});
        }
        recordLiveRunForScenario(latest.scenario_id, latest.run_id);
        bumpStorageRevision();
        return latest;
      } catch (err) {
        if (isSocietyRunNotFoundError(err)) {
          discardMissingRun(active.run_id);
          setters.setError(
            "This society run no longer exists on the API. Use Run new demo, or open the latest run for this scenario from the database.",
          );
          return undefined;
        }
        throw err;
      } finally {
        setters.setRunRefreshing(false);
      }
    },
    [setters, discardMissingRun, bumpStorageRevision, refreshDbReportForScenario],
  );

  return {discardMissingRun, applySavedReport, refresh};
}
