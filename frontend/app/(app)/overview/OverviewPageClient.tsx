"use client";

import Link from "next/link";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {Metric} from "@/components/Metric";
import {HomeReportingPanels} from "@/components/overview/HomeReportingPanels";
import {LatestSavedReportPanel} from "@/components/overview/LatestSavedReportPanel";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {effectiveApiBasePreview, loadClientSettings} from "@/lib/client-settings";
import {useRunWorkspace} from "@/lib/run-workspace";
import {
  panelClass,
  wsActions,
  wsEmpty,
  wsGridSingle,
  wsLead,
  wsMeta,
  wsMetaRow,
  wsMetricsGrid,
  wsPage,
  wsPanelTitle,
  wsStep,
} from "@/lib/workspace-ui";

export function OverviewPageClient() {
  const ws = useRunWorkspace();
  const connection = loadClientSettings();
  const apiUrl = effectiveApiBasePreview(connection);
  const projectId = connection.projectId;

  return (
    <div className={wsPage}>
      <WorkspaceAlerts />

      <article className={panelClass()}>
        <p className={wsStep}>Overview</p>
        <h2 className={wsPanelTitle}>Home</h2>
        <p className={wsLead}>Check session status, then start or continue a run from the Run page.</p>
        <div className={wsMetaRow}>
          <span>API {apiUrl}</span>
          <span aria-hidden>·</span>
          <span>workspace {projectId}</span>
        </div>
        <div className={wsActions}>
          <Button asChild size="lg">
            <Link href="/runs">Go to Run</Link>
          </Button>
        </div>
      </article>

      <section className={`${wsGridSingle} lg:grid-cols-2`}>
        <article className={panelClass("flex flex-col")}>
          <p className={wsStep}>Current run</p>
          <h3 className={wsPanelTitle}>Session</h3>
          {ws.run ? (
            <div className="mt-3 flex flex-1 flex-col">
              <p className="text-base font-medium text-foreground">{ws.run.scenario_id}</p>
              <p className={`${wsMeta} font-mono text-[11px] break-all`}>{ws.run.run_id}</p>
              <Button variant="link" className="mt-auto self-start px-0" onClick={() => ws.setRunDetailDialogOpen(true)}>
                View run details
              </Button>
            </div>
          ) : (
            <div className={`${wsEmpty} mt-3 flex-1`}>No active run in this browser session. Start one from Run.</div>
          )}
        </article>

        <article className={panelClass()}>
          <p className={wsStep}>Activity</p>
          <h3 className={wsPanelTitle}>Live counters</h3>
          <p className="mt-1 text-xs text-muted-foreground">Refreshed with the active run and API health.</p>
          <div className={`${wsMetricsGrid} mt-4`}>
            <Metric label="Agents" value={ws.agents.length} />
            <Metric label="Tickets" value={ws.tickets.length} />
            <Metric label="Messages" value={ws.messages.length} />
            <Metric label="Conflicts" value={ws.conflicts.length} />
          </div>
        </article>
      </section>

      <LatestSavedReportPanel report={ws.latestSavedReport} />

      <HomeReportingPanels
        scenarios={ws.scenarios}
        run={ws.run}
        messages={ws.messages}
        tickets={ws.tickets}
        agents={ws.agents}
        conflicts={ws.conflicts}
        viewState={ws.viewState}
      />
    </div>
  );
}
