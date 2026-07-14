"use client";

import {useEffect} from "react";
import Link from "next/link";
import {createLogger} from "@/lib/app-logger";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {WorkspaceSelect} from "@/components/workspace/WorkspaceSelect";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {shouldPollSocietyRun} from "@/lib/demo-state";
import {useRunWorkspace} from "@/lib/run-workspace";
import {panelClass, wsActions, wsFieldControl, wsFieldLabel, wsGridSingle, wsMeta, wsStep} from "@/lib/workspace-ui";
import {RunsJudgeIntroPanel} from "./RunsJudgeIntro";
import {ScenarioRunPicker} from "@/components/workspace/ScenarioRunPicker";

const runsLog = createLogger("runs-page");

export function RunsPageClient() {
  const ws = useRunWorkspace();

  const scenarioOptions = ws.scenarios.map(item => ({
    value: item.scenario_id,
    label: item.title,
  }));

  const runInProgress = ws.run != null && shouldPollSocietyRun(ws.run.state);

  const scenariosReady = ws.scenarios.length > 0;
  const scenarioSelectDisabled = ws.busy || (ws.scenariosLoading && !scenariosReady);

  const runNewDisabled =
    ws.busy || runInProgress || ws.viewState === "degraded" || (ws.scenariosLoading && !scenariosReady);

  const loadLatestDisabled = ws.busy || runInProgress || (ws.scenariosLoading && !scenariosReady);

  useEffect(() => {
    runsLog.debug("run form scenario state", {
      scenarioId: ws.scenarioId,
      selectedId: ws.selected?.scenario_id ?? null,
      selectedTitle: ws.selected?.title ?? null,
      scenarioCount: ws.scenarios.length,
      scenariosLoading: ws.scenariosLoading,
      activeRunScenarioId: ws.run?.scenario_id ?? null,
    });
  }, [ws.scenarioId, ws.selected, ws.scenarios.length, ws.scenariosLoading, ws.run?.scenario_id]);

  return (
    <>
      <WorkspaceAlerts />
      <section className={wsGridSingle}>
        <article className={panelClass()}>
          <div className={wsStep}>Change request</div>
          <label className={wsFieldLabel} htmlFor="demo-scenario">
            Demo scenario
            <WorkspaceSelect
              id="demo-scenario"
              value={ws.scenarioId}
              disabled={scenarioSelectDisabled}
              onValueChange={ws.onScenarioChange}
              placeholder={ws.scenariosLoading && !scenariosReady ? "Loading scenarios…" : "Select scenario"}
              aria-label="Demo scenario"
              options={scenarioOptions}
            />
          </label>
          <RunsJudgeIntroPanel
            scenarioId={ws.scenarioId}
            scenarios={ws.scenarios}
            scenariosLoading={ws.scenariosLoading}
          />
          <details className="mt-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 open:pb-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Optional custom request
            </summary>
            <label className={`${wsFieldLabel} mt-3`} htmlFor="demo-request">
              Request text
              <textarea
                id="demo-request"
                className={wsFieldControl}
                value={ws.requestText}
                disabled={ws.busy || runInProgress || (ws.scenariosLoading && !scenariosReady)}
                placeholder={
                  ws.scenariosLoading && !scenariosReady
                    ? "Waiting for API…"
                    : "Leave empty for the scenario’s built-in demo request (recommended for judges)."
                }
                onChange={e => ws.setRequestText(e.target.value)}
                rows={4}
              />
            </label>
          </details>
          <ScenarioRunPicker
            className="mt-4"
            scenarioTitle={ws.selected?.title ?? ws.scenarioId}
            availability={ws.scenarioRunAvailability}
            activeSource={ws.runViewSource}
            activeRunId={ws.run?.run_id ?? null}
            disabled={ws.busy || (ws.scenariosLoading && !scenariosReady)}
            onSelectSource={source => ws.setRunViewSource(source)}
          />
          <div className="mt-4">
            <p className={wsStep}>Demo actions</p>
            <div className={wsActions}>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 min-w-[10.5rem] border border-border/90 shadow-sm"
                onClick={() => void ws.loadLatestDemo()}
                disabled={loadLatestDisabled || (!ws.scenarioRunAvailability.snapshot && !ws.scenarioRunAvailability.live)}
              >
                {ws.busy ? "Working…" : "Open in Work queue"}
              </Button>
              <Button type="button" className="min-h-10 min-w-[10.5rem]" onClick={() => void ws.start()} disabled={runNewDisabled}>
                {ws.busy ? "Working…" : runInProgress ? "Run in progress…" : "Run new demo"}
              </Button>
              {ws.run && (
                <Button type="button" variant="ghost" onClick={() => ws.setResetRunDialogOpen(true)}>
                  Clear session
                </Button>
              )}
            </div>
          </div>
          <p className={`${wsMeta} mt-2 max-w-none`}>
            Choose <strong className="font-medium text-foreground">Latest in database</strong> or{" "}
            <strong className="font-medium text-foreground">Active session run</strong> above, then{" "}
            <strong className="font-medium text-foreground">Open in Work queue</strong> for that scenario.{" "}
            <strong className="font-medium text-foreground">Run new demo</strong> starts a fresh live run for the
            selected scenario.
          </p>
          {runInProgress && (
            <p className={`${wsMeta} mt-3`}>
              Society run is active — open{" "}
              <Link href="/agents" className="text-primary underline-offset-2 hover:underline">
                Work queue
              </Link>{" "}
              for live updates, or wait until it finishes to start another demo.
            </p>
          )}
        </article>
      </section>
    </>
  );
}
