"use client";

import {Button} from "@/components/animate-ui/components/buttons/button";
import {AblationComparisonTable} from "@/components/AblationComparisonTable";
import {useRunWorkspace} from "@/lib/run-workspace";
import {panelClass, wsPre, wsStep} from "@/lib/workspace-ui";

/** Baseline evaluation on the Results tab of the run hub. */
export function RunReportsTabClient() {
  const ws = useRunWorkspace();
  const displayEvaluation = ws.evaluation ?? ws.latestSavedReport?.evaluation ?? null;

  if (!ws.run && !displayEvaluation) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {ws.run && !displayEvaluation && (
        <article className={panelClass()}>
          <div className={wsStep}>Compare to one agent</div>
          <p className="mb-3 text-sm text-muted-foreground">
            Runs the same scenario with a single agent, then fills the table below so judges can compare coverage and token
            use against the multi-agent run.
          </p>
          <Button variant="outline" onClick={() => void ws.evaluate()} disabled={ws.busy}>
            Compare with single agent
          </Button>
        </article>
      )}
      {displayEvaluation && (
        <article className={panelClass()}>
          <AblationComparisonTable evaluation={displayEvaluation} />
          <details className="mt-4">
            <summary className="cursor-pointer text-sm">Evaluation JSON (optional)</summary>
            <pre className={`${wsPre} mt-2`}>{JSON.stringify(displayEvaluation, null, 2)}</pre>
          </details>
        </article>
      )}
    </div>
  );
}
