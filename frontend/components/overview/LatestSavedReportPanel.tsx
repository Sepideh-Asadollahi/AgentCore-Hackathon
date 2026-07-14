"use client";

import Link from "next/link";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {runDetailTabHref} from "@/lib/run-detail-tabs";
import type {SavedRunReport} from "@/lib/run-report-storage";
import {panelClass, wsEmpty, wsMeta, wsPanelTitle, wsPre, wsStep} from "@/lib/workspace-ui";

type Props = {
  report: SavedRunReport | null;
};

export function LatestSavedReportPanel({report}: Props) {
  if (!report) {
    return (
      <article className={panelClass()}>
        <p className={wsStep}>Archive</p>
        <h3 className={wsPanelTitle}>Latest run in database</h3>
        <div className={wsEmpty}>Complete a society run with CHANGE_SOCIETY_STORE=postgresql to persist the latest review per scenario.</div>
      </article>
    );
  }

  const savedLabel = new Date(report.savedAt).toLocaleString();

  return (
    <article className={panelClass()}>
      <p className={wsStep}>Archive</p>
      <h3 className={wsPanelTitle}>Latest run in database</h3>
      <p className={`${wsMeta} mt-1`}>
        Stored {savedLabel} · scenario <span className="font-mono text-[11px]">{report.run.scenario_id}</span> · state{" "}
        {report.run.state}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {report.messages.length} messages · {report.tickets.length} tickets · {report.conflicts.length} conflicts
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={runDetailTabHref(report.run.run_id, "reports")}>Open Results tab</Link>
        </Button>
      </div>
      {report.run.final_result && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-foreground">Saved decision snapshot</summary>
          <pre className={`${wsPre} mt-2 max-h-64 overflow-auto`}>{JSON.stringify(report.run.final_result, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}
