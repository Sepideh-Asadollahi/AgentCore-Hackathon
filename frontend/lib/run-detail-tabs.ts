export const RUN_DETAIL_TABS = [
  {id: "guide", label: "Guide", hint: "Start here: status, what the demo proves, and where to click next"},
  {
    id: "story",
    label: "Agent Story",
    hint: "Business problem, then each agent’s message in order, plus a flow map",
  },
  {id: "queue", label: "Work Queue", hint: "Proof of task routing — who did what and whether it finished"},
  {id: "dialogue", label: "Messages", hint: "Full technical list of specialist messages (for audit)"},
  {id: "approve", label: "Review", hint: "Risk disagreements, short summary, and human approve / reject"},
  {id: "reports", label: "Results", hint: "Scores vs rubric, tokens, and compare to one-agent baseline"},
  {id: "request", label: "Details", hint: "Original request text and IDs for matching API logs"},
] as const;

export type RunDetailTabId = (typeof RUN_DETAIL_TABS)[number]["id"];

const TAB_SET = new Set<string>(RUN_DETAIL_TABS.map(t => t.id));

/** Merged tabs — old URLs still resolve. */
const LEGACY_TAB_ALIASES: Record<string, RunDetailTabId> = {
  agents: "queue",
  conflicts: "approve",
  metrics: "reports",
  technical: "request",
  flow: "story",
  exchange: "story",
};

export function canonicalRunDetailTab(value?: string | null): RunDetailTabId {
  if (value && TAB_SET.has(value)) return value as RunDetailTabId;
  if (value && value in LEGACY_TAB_ALIASES) return LEGACY_TAB_ALIASES[value];
  return "guide";
}

/** @deprecated Use canonicalRunDetailTab */
export function parseRunDetailTab(value?: string | null): RunDetailTabId {
  return canonicalRunDetailTab(value);
}

export function runDetailTabHref(runId: string, tab: RunDetailTabId | string): string {
  const id = canonicalRunDetailTab(tab);
  return `/agents?run=${encodeURIComponent(runId)}&tab=${id}`;
}
