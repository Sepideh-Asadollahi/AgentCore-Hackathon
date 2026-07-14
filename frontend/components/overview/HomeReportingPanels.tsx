"use client";

import {useMemo} from "react";
import {Metric} from "@/components/Metric";
import {MiniBarChart} from "@/components/overview/MiniBarChart";
import {MiniDonutChart} from "@/components/overview/MiniDonutChart";
import {buildHomeReportSnapshot} from "@/lib/home-reporting";
import type {AgentMessage, AgentTicket, Conflict, ManagedAgent, Scenario, SocietyRun} from "@/lib/api";
import {panelClass, wsGridSingle, wsMetricsGrid, wsPanelTitle, wsStep} from "@/lib/workspace-ui";

type HomeReportingPanelsProps = {
  scenarios: Scenario[];
  run: SocietyRun | null;
  messages: AgentMessage[];
  tickets: AgentTicket[];
  agents: ManagedAgent[];
  conflicts: Conflict[];
  viewState: string;
};

export function HomeReportingPanels({
  scenarios,
  run,
  messages,
  tickets,
  agents,
  conflicts,
  viewState,
}: HomeReportingPanelsProps) {
  const report = useMemo(
    () =>
      buildHomeReportSnapshot({
        scenarios,
        run,
        messages,
        tickets,
        agents,
        conflicts,
        viewState,
      }),
    [scenarios, run, messages, tickets, agents, conflicts, viewState],
  );

  return (
    <section className="flex w-full min-w-0 flex-col gap-5">
      <article className={panelClass()}>
        <p className={wsStep}>Reporting</p>
        <h3 className={wsPanelTitle}>Session snapshot</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Live charts from the active run; scenario catalog fills in before you start.
        </p>
        <div className={`${wsMetricsGrid} mt-4 md:grid-cols-4`}>
          <Metric label="Demo scenarios" value={report.summary.scenarios} />
          <Metric label="Open conflicts" value={report.summary.openConflicts} />
          <Metric label="Token usage" value={report.summary.totalTokens} />
          <Metric label="Approval" value={report.summary.approvalStatus} />
        </div>
      </article>

      <div className={`${wsGridSingle} xl:grid-cols-2`}>
        <article className={panelClass()}>
          <MiniBarChart
            title="Run quality"
            caption={report.hasRun ? "Recall and activity indicators (0–100 scale)." : "Start a run to populate quality bars."}
            data={report.qualityBars}
            maxValue={100}
            valueSuffix="%"
            emptyLabel="Quality metrics appear after a society run starts."
          />
        </article>

        <article className={panelClass()}>
          <MiniDonutChart
            title="Ticket pipeline"
            caption="States across durable agent tickets."
            data={report.ticketStateBars}
            emptyLabel="Ticket states chart fills in once work is routed."
          />
        </article>

        <article className={panelClass()}>
          <MiniBarChart
            title="Protocol messages"
            caption="Top message types in the current session."
            data={report.messageTypeBars}
            emptyLabel="Message volume by type appears during a run."
          />
        </article>

        <article className={panelClass()}>
          <MiniBarChart
            title="Risk mix"
            caption="Distribution of message risk levels."
            data={report.riskMixBars}
            emptyLabel="Risk breakdown appears as agents exchange messages."
          />
        </article>

        <article className={panelClass()}>
          <MiniBarChart
            title="Agent workload"
            caption="Active tickets per registered agent."
            data={report.agentLoadBars}
            emptyLabel="No routed tickets yet."
          />
        </article>

        <article className={panelClass()}>
          <MiniBarChart
            title="Scenario catalog"
            caption="Demo scenarios grouped by domain."
            data={report.scenarioDomainBars}
            emptyLabel="Scenario list is still loading from the API."
          />
        </article>
      </div>
    </section>
  );
}
