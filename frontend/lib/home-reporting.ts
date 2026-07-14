import type {AgentMessage, AgentTicket, Conflict, ManagedAgent, Scenario, SocietyRun} from "@/lib/api";

export type ReportBar = {label: string; value: number};

export type HomeReportSnapshot = {
  hasRun: boolean;
  viewState: string;
  summary: {
    scenarios: number;
    openConflicts: number;
    totalTokens: number;
    approvalStatus: string;
  };
  qualityBars: ReportBar[];
  messageTypeBars: ReportBar[];
  ticketStateBars: ReportBar[];
  agentLoadBars: ReportBar[];
  scenarioDomainBars: ReportBar[];
  riskMixBars: ReportBar[];
};

function countLabels(values: string[], limit = 6): ReportBar[] {
  const tallies = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim() || "unknown";
    tallies.set(label, (tallies.get(label) ?? 0) + 1);
  }
  return [...tallies.entries()]
    .map(([label, value]) => ({label, value}))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function pctMetric(metrics: Record<string, number | object>, key: string): number {
  const raw = metrics[key];
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

export function sumMessageTokens(messages: AgentMessage[]): number {
  let total = 0;
  for (const message of messages) {
    for (const amount of Object.values(message.token_usage ?? {})) {
      if (typeof amount === "number") total += amount;
    }
  }
  return total;
}

/** Derive home-page reporting series from live workspace state (unit-tested). */
export function buildHomeReportSnapshot(input: {
  scenarios: Scenario[];
  run: SocietyRun | null;
  messages: AgentMessage[];
  tickets: AgentTicket[];
  agents: ManagedAgent[];
  conflicts: Conflict[];
  viewState: string;
}): HomeReportSnapshot {
  const openConflicts = input.conflicts.filter(c => c.status !== "resolved").length;
  const runTokens =
    typeof input.run?.metrics.total_tokens === "number"
      ? Number(input.run.metrics.total_tokens)
      : sumMessageTokens(input.messages);

  const qualityBars: ReportBar[] = input.run
    ? (() => {
        const resolvedConflicts = input.conflicts.filter(c => c.status === "resolved").length;
        const conflictResolution =
          input.conflicts.length > 0 ? Math.round((resolvedConflicts / input.conflicts.length) * 100) : 0;
        return [
          {label: "Impact recall", value: pctMetric(input.run.metrics, "critical_impact_recall")},
          {label: "Policy recall", value: pctMetric(input.run.metrics, "policy_match_recall")},
          {label: "Conflict resolution", value: conflictResolution},
        ];
      })()
    : [
        {label: "Impact recall", value: 0},
        {label: "Policy recall", value: 0},
        {label: "Conflict resolution", value: 0},
      ];

  const messageTypeBars = countLabels(input.messages.map(m => m.message_type.replaceAll("_", " ")));
  const ticketStateBars = countLabels(input.tickets.map(t => t.state.replaceAll("_", " ")));
  const agentLoadBars = input.agents
    .map(agent => ({label: agent.name, value: agent.active_ticket_count}))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const scenarioDomainBars = countLabels(input.scenarios.map(s => s.domain));
  const riskMixBars = countLabels(input.messages.map(m => m.risk_level));

  return {
    hasRun: Boolean(input.run),
    viewState: input.viewState,
    summary: {
      scenarios: input.scenarios.length,
      openConflicts,
      totalTokens: runTokens,
      approvalStatus: input.run?.approval?.status ?? "none",
    },
    qualityBars,
    messageTypeBars,
    ticketStateBars,
    agentLoadBars,
    scenarioDomainBars,
    riskMixBars,
  };
}
