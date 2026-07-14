"use client";

import {Button} from "@/components/animate-ui/components/buttons/button";
import {shouldPollSocietyRun} from "@/lib/demo-state";
import {useRunWorkspace} from "@/lib/run-workspace";

export function RunsHeaderActions() {
  const ws = useRunWorkspace();

  const runInProgress = ws.run != null && shouldPollSocietyRun(ws.run.state);
  const scenariosReady = ws.scenarios.length > 0;
  const runNewDisabled =
    ws.busy || runInProgress || ws.viewState === "degraded" || (ws.scenariosLoading && !scenariosReady);
  const loadDisabled =
    ws.busy ||
    runInProgress ||
    (ws.scenariosLoading && !scenariosReady) ||
    (!ws.scenarioRunAvailability.snapshot && !ws.scenarioRunAvailability.live);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-9 min-w-[5.5rem] border border-border/90 shadow-sm"
        onClick={() => void ws.loadLatestDemo()}
        disabled={loadDisabled}
      >
        {ws.busy ? "Working…" : "Load"}
      </Button>
      <Button
        type="button"
        size="sm"
        className="min-h-9 min-w-[5.5rem]"
        onClick={() => void ws.start()}
        disabled={runNewDisabled}
      >
        {ws.busy ? "Working…" : runInProgress ? "Running…" : "Run"}
      </Button>
    </div>
  );
}
