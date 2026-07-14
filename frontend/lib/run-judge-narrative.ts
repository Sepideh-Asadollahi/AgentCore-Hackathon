import type {AgentTicket, SocietyRun} from "@/lib/api";

export type JudgeRunBrief = {
  headline: string;
  paragraphs: string[];
  judgeTips: string[];
  valueBullets: string[];
};

export type JudgeTicketBrief = {
  roleLabel: string;
  whatHappened: string;
  whyItMatters: string;
  lifecyclePlain: string;
};

const VALUE_BULLETS = [
  "Multiple expert agents work in parallel and cite evidence — not one chatbot answering everything at once.",
  "Every step leaves a visible task and message trail you can follow like an audit log.",
  "If agents disagree on risk, the run stops until a human approves, rejects, or asks for changes — nothing silently merges.",
  "The same backend can swap in real agents or customer integrations; this UI is the judge-facing window on that pipeline.",
];

export function explainRunState(state: string): {headline: string; body: string; judgeTip: string} {
  switch (state) {
    case "accepted":
      return {
        headline: "Run accepted",
        body: "The change request is in the queue. The coordinator will assign work to the change, impact, and policy agents.",
        judgeTip: "Work Queue — each row is a routed task with a status (assigned → completed), not a single chat reply.",
      };
    case "gathering_context":
      return {
        headline: "Gathering context",
        body: "A context scout pulls evidence from the demo catalog so later answers can point to real sources instead of guessing.",
        judgeTip: "This is the grounding step: specialists should only cite evidence the scout selected.",
      };
    case "decomposing":
      return {
        headline: "Breaking work into tasks",
        body: "The coordinator splits the request into separate jobs and assigns them to the registered agents.",
        judgeTip: "Watch tasks move through statuses — that shows orchestration, not one monolithic model call.",
      };
    case "analyzing":
      return {
        headline: "Specialists analyzing",
        body: "Change, impact, and policy agents analyze the request in parallel and send structured updates to each other.",
        judgeTip: "Agent Story tab — read the scenario trap and timeline; Review tab if they disagree on risk.",
      };
    case "reconciling":
      return {
        headline: "Combining answers",
        body: "The coordinator merges specialist outputs, records any disagreements, and prepares a human decision if needed.",
        judgeTip: "This step is the multi-agent value: separate voices stay separate until reconciled.",
      };
    case "awaiting_approval":
      return {
        headline: "Waiting for a human decision",
        body: "Automated analysis is done. At least one disagreement or policy issue needs an explicit approve, reject, or request-changes before the run can finish.",
        judgeTip: "Agent Story for the full exchange → Review for buttons → Results for scores after completion.",
      };
    case "finalizing":
      return {
        headline: "Wrapping up",
        body: "The coordinator saves the final decision and closes open tasks.",
        judgeTip: "Usually brief — expect Completed or a return to waiting for approval.",
      };
    case "completed":
      return {
        headline: "Run completed",
        body: "The run finished with an approved outcome. Open Results for rubric scores, token use, and optional comparison to one agent on the same scenario.",
        judgeTip: "Results tab — use Compare with single agent to see coverage vs cost trade-offs.",
      };
    case "failed":
      return {
        headline: "Run failed",
        body: "Processing stopped on an error. Use Details for the tracking ID to match API logs if you need to diagnose.",
        judgeTip: "Failures are shown explicitly — the UI does not pretend success.",
      };
    default:
      return {
        headline: "Run in progress",
        body: "The pipeline is still working on this change request.",
        judgeTip: "Counts below (tasks, messages, disagreements) should increase on refresh while work is running.",
      };
  }
}

const CAPABILITY_COPY: Record<string, {role: string; what: string; why: string}> = {
  retrieve_scoped_project_truth: {
    role: "Context scout",
    what: "Collected demo evidence for this scenario (files, policies, catalog entries).",
    why: "Later claims should cite these sources — judges can check whether agents stayed grounded.",
  },
  interpret_ambiguous_software_change: {
    role: "Change analyst",
    what: "Interpreted the engineering change: intent, scope, and product side effects.",
    why: "Separates “just a refactor” from changes customers or revenue would notice.",
  },
  analyze_cross_boundary_impact: {
    role: "Impact analyst",
    what: "Traced blast radius: downstream code, tests, owners, and business impact.",
    why: "Shows cross-team impact thinking that a single prompt often skips.",
  },
  evaluate_policy_and_approval_risk: {
    role: "Policy guardian",
    what: "Checked org rules, approval requirements, and release blockers.",
    why: "Independent policy voice — the change analyst should not be the only risk rating.",
  },
  decompose_route_reconcile: {
    role: "Coordinator",
    what: "Split the request into tasks, assigned agents, and merged their outputs.",
    why: "This is the orchestration demo: routed work with a visible history.",
  },
  coordinate_frontend_ui_delivery: {
    role: "Frontend delivery lead",
    what: "Recorded customer-visible UI work when the scenario requires a frontend handoff.",
    why: "Shows the society can emit delivery signals, not only backend analysis.",
  },
};

export function explainTicketLifecycle(events: AgentTicket["events"]): string {
  if (!events.length) return "Not started yet.";
  const labels: Record<string, string> = {
    assigned: "assigned to an agent",
    claimed: "claimed by the worker",
    in_progress: "actively running",
    review: "output under review",
    completed: "completed with recorded output",
  };
  const parts = events.map(e => labels[e.to_state] ?? e.to_state.replaceAll("_", " "));
  return `Progress: ${parts.join(", then ")}.`;
}

function plainTicketState(state: string): string {
  const labels: Record<string, string> = {
    assigned: "Assigned — waiting for worker",
    claimed: "Claimed — worker picked it up",
    in_progress: "In progress",
    review: "Under review",
    completed: "Completed",
  };
  return labels[state] ?? state.replaceAll("_", " ");
}

export function explainTicket(ticket: Pick<AgentTicket, "title" | "capability" | "state">): JudgeTicketBrief {
  const copy = CAPABILITY_COPY[ticket.capability];
  if (copy) {
    return {
      roleLabel: copy.role,
      whatHappened: copy.what,
      whyItMatters: copy.why,
      lifecyclePlain: `Current status: ${plainTicketState(ticket.state)}.`,
    };
  }
  return {
    roleLabel: ticket.title,
    whatHappened: `Specialist step: ${ticket.title}.`,
    whyItMatters: "Each step is a separate governed task in the pipeline — expand other rows to see the full chain.",
    lifecyclePlain: `Current status: ${plainTicketState(ticket.state)}.`,
  };
}

export function buildJudgeRunBrief(
  run: SocietyRun,
  counts: {messages: number; tickets: number; conflicts: number; openConflicts: number},
): JudgeRunBrief {
  const state = explainRunState(run.state);
  const paragraphs = [
    "You are reviewing a multi-agent change analysis demo — not a single chat window. The request starts on the Run page; the backend creates a run, assigns tasks to agents, and records what each specialist said and where they disagreed.",
    state.body,
    `Audit trail so far: ${counts.tickets} tasks, ${counts.messages} specialist messages, ${counts.conflicts} recorded disagreements (${counts.openConflicts} still open). Use Details if you need IDs for API logs.`,
    run.request_text
      ? `Change request (excerpt): “${run.request_text.length > 160 ? `${run.request_text.slice(0, 160)}…` : run.request_text}”`
      : "",
  ].filter(Boolean);

  const judgeTips = [
    state.judgeTip,
    "Suggested order: Guide (here) → Agent Story (narrative + map) → Work Queue (task proof) → Review / Results as needed.",
    counts.conflicts > 0
      ? "This run has disagreements — read Agent Story for context, then Review for the summary and decision buttons."
      : "If disagreements appear, Agent Story explains them; Results shows measurable comparison to one agent.",
  ];

  return {
    headline: state.headline,
    paragraphs,
    judgeTips,
    valueBullets: VALUE_BULLETS,
  };
}
