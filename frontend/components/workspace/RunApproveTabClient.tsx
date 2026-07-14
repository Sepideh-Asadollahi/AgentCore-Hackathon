"use client";

import {Button} from "@/components/animate-ui/components/buttons/button";
import {NegotiationPanel} from "@/components/NegotiationPanel";
import {useRunWorkspace} from "@/lib/run-workspace";
import {humanRunStateLabel} from "@/lib/demo-state";
import {wsActions} from "@/lib/workspace-ui";

/** Approve / reject / request-changes — same run tab hub as Work queue. */
export function RunApproveTabClient() {
  const ws = useRunWorkspace();
  const run = ws.run;

  if (!run) {
    return <p className="text-sm text-muted-foreground">Open a run from the Run page to use approval actions.</p>;
  }

  return (
    <>
      <NegotiationPanel run={run} messages={ws.messages} conflicts={ws.conflicts} />
      {run.state === "awaiting_approval" ? (
        <div className={wsActions}>
          <Button onClick={() => void ws.decide("approve")} disabled={ws.busy}>
            Approve plan
          </Button>
          <Button variant="secondary" onClick={() => void ws.decide("request-changes")} disabled={ws.busy}>
            Request changes
          </Button>
          <Button variant="destructive" onClick={() => void ws.decide("reject")} disabled={ws.busy}>
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Run status: <span className="text-foreground">{humanRunStateLabel(run.state)}</span>
          {run.approval?.status && (
            <>
              {" "}
              · your decision: <span className="text-foreground">{run.approval.status}</span>
            </>
          )}
          {run.state !== "awaiting_approval" && (
            <span className="block mt-1 text-xs">
              Approve / Reject / Request changes appear only while the run is waiting for your approval.
            </span>
          )}
        </p>
      )}
    </>
  );
}
