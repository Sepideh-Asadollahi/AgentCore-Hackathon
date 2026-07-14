import Link from "next/link";
import {runDetailTabHref} from "@/lib/run-detail-tabs";
import type {RunSnapshotServer} from "@/lib/server-change-society";
import {explainRunState} from "@/lib/run-judge-narrative";
import {panelClass, wsLead, wsMeta, wsPanelTitle, wsPre, wsStep} from "@/lib/workspace-ui";

export function OverviewLatestServerPanel({snapshot, runId}: {snapshot: RunSnapshotServer | null; runId: string | null}) {
  if (!runId || !snapshot) return null;

  const narrative = explainRunState(snapshot.run.state);

  return (
    <article className={panelClass()}>
      <p className={wsStep}>Latest run (saved in this browser)</p>
      <h3 className={wsPanelTitle}>{narrative.headline}</h3>
      <p className={`${wsLead} mt-2`}>{narrative.body}</p>
      <p className={`${wsMeta} mt-2`}>
        <span className="font-mono text-[11px]">{snapshot.run.run_id}</span> · scenario {snapshot.run.scenario_id}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Audit trail: {snapshot.messages.length} messages, {snapshot.tickets.length} tickets, {snapshot.conflicts.length}{" "}
        conflicts — open Work queue for the full judge walkthrough.
      </p>
      <p className="mt-3 text-sm">
        <Link href={runDetailTabHref(snapshot.run.run_id, "queue")} className="text-primary underline-offset-2 hover:underline">
          Work Queue
        </Link>
        {" · "}
        <Link href={runDetailTabHref(snapshot.run.run_id, "reports")} className="text-primary underline-offset-2 hover:underline">
          Results
        </Link>
      </p>
      {snapshot.run.final_result && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm">Decision snapshot</summary>
          <pre className={`${wsPre} mt-2 max-h-48 overflow-auto`}>{JSON.stringify(snapshot.run.final_result, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}
