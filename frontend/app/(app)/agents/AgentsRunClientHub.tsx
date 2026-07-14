"use client";

import {useCallback, useEffect, useMemo} from "react";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {WorkspaceSelect} from "@/components/workspace/WorkspaceSelect";
import {ScenarioRunPicker} from "@/components/workspace/ScenarioRunPicker";
import {RunDetailTabBar} from "@/components/workspace/RunDetailTabBar";
import {RunDetailTabPanel} from "@/components/workspace/RunDetailTabViews";
import {AgentsRunServerPanel} from "@/app/(app)/agents/AgentsRunServerPanel";
import {shouldPollSocietyRun} from "@/lib/demo-state";
import type {RunDetailTabId} from "@/lib/run-detail-tabs";
import type {RunSnapshotServer} from "@/lib/server-change-society";
import {useRunWorkspace} from "@/lib/run-workspace";
import {workspaceToRunSnapshot} from "@/lib/workspace-run-snapshot";
import {abandonStaleRunSession} from "@/lib/run-session-cookies";
import {panelClass, wsFieldLabel, wsGridSingle, wsStep} from "@/lib/workspace-ui";

type Props = {
  runId: string | null;
  tab: RunDetailTabId;
  ssrSnapshot: RunSnapshotServer | null;
  autoRefresh: boolean;
  fetchedAt: string;
  loadError?: string;
  staleRunId?: string | null;
};

/** Scenario + saved/live picker; client run hub when workspace has loaded data. */
export function AgentsRunClientHub({
  runId,
  tab,
  ssrSnapshot,
  autoRefresh,
  fetchedAt,
  loadError,
  staleRunId,
}: Props) {
  const ws = useRunWorkspace();

  useEffect(() => {
    if (staleRunId) abandonStaleRunSession();
  }, [staleRunId]);

  useEffect(() => {
    if (!runId || !ws.run || ws.run.run_id !== runId) return;
    if (ws.run.scenario_id !== ws.scenarioId) {
      ws.setScenarioId(ws.run.scenario_id);
    }
  }, [runId, ws.run, ws.scenarioId, ws.setScenarioId]);

  const scenarioOptions = ws.scenarios.map(item => ({
    value: item.scenario_id,
    label: item.title,
  }));

  const clientSnapshot = useMemo(() => {
    if (!ws.run) return null;
    return workspaceToRunSnapshot({
      run: ws.run,
      messages: ws.messages,
      tickets: ws.tickets,
      conflicts: ws.conflicts,
      agents: ws.agents,
    });
  }, [ws.run, ws.messages, ws.tickets, ws.conflicts, ws.agents]);

  const showClientHub = Boolean(
    ws.run &&
      clientSnapshot &&
      ws.runViewSource != null &&
      ws.run.scenario_id === ws.scenarioId &&
      (!runId || ws.run.run_id === runId),
  );

  const clientAutoRefresh = ws.run != null && shouldPollSocietyRun(ws.run.state) && ws.runViewSource === "live";

  const onPickerSelect = useCallback(
    (source: Parameters<typeof ws.selectScenarioRunView>[0]) => {
      void ws.selectScenarioRunView(source, {navigateToAgents: false});
    },
    [ws.selectScenarioRunView],
  );

  return (
    <>
      <WorkspaceAlerts />
      <section className={`${wsGridSingle} mb-4`}>
        <article className={panelClass()}>
          <div className={wsStep}>For judges — scenario and data source</div>
          <label className={wsFieldLabel} htmlFor="agents-demo-scenario">
            Demo scenario
            <WorkspaceSelect
              id="agents-demo-scenario"
              value={ws.scenarioId}
              disabled={ws.busy || (ws.scenariosLoading && ws.scenarios.length === 0)}
              onValueChange={id => {
                ws.onScenarioChange(id);
                const nextSource = ws.runViewSource ?? "snapshot";
                void ws.selectScenarioRunView(nextSource, {navigateToAgents: false, scenarioId: id});
              }}
              placeholder={ws.scenariosLoading ? "Loading scenarios…" : "Select scenario"}
              aria-label="Demo scenario"
              options={scenarioOptions}
            />
          </label>
          <ScenarioRunPicker
            className="mt-4"
            scenarioTitle={ws.selected?.title ?? ws.scenarioId}
            availability={ws.scenarioRunAvailability}
            activeSource={ws.runViewSource}
            activeRunId={ws.run?.run_id ?? null}
            disabled={ws.busy}
            onSelectSource={onPickerSelect}
          />
        </article>
      </section>

      {showClientHub && clientSnapshot ? (
        <section className={wsGridSingle}>
          {clientAutoRefresh && <meta httpEquiv="refresh" content="4" />}
          <RunDetailTabBar runId={clientSnapshot.run.run_id} activeTab={tab} />
          <RunDetailTabPanel
            tab={tab}
            snapshot={clientSnapshot}
            autoRefresh={clientAutoRefresh}
            fetchedAt={ws.lastRefreshAt ? new Date(ws.lastRefreshAt).toISOString() : fetchedAt}
          />
        </section>
      ) : (
        <AgentsRunServerPanel
          snapshot={ssrSnapshot}
          runId={runId}
          tab={tab}
          autoRefresh={autoRefresh}
          fetchedAt={fetchedAt}
          loadError={loadError}
        />
      )}
    </>
  );
}
