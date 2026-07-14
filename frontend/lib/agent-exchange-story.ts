import type {AgentMessage, Conflict, Scenario, SocietyRun} from "./api";

const SCENARIO_REQUEST_HOOKS: Record<string, string> = {
  "pricing-refactor":
    "This looks like a small tax refactor, but changing price before tax can silently affect customer bills and revenue.",
  "password-migration":
    "Upgrading password hashing is good security—unless existing users get locked out during the switch.",
  "payment-memory":
    "Retrying failed PayPal calls sounds harmless—unless old retry state causes customers to be charged twice.",
  "checkout-api-refactor":
    "An internal checkout cleanup can still break mobile apps if the API response drops fields they rely on.",
  "hr-compensation-export":
    "A manager export for reviews can leak salary and personal IDs if HR and Legal have not signed off.",
  "gdpr-erasure-automation":
    "Auto-deleting user data on ticket close can violate finance rules if invoices must be kept longer.",
  "vendor-access-offboarding":
    "A contractor can be marked terminated in HR while their system access stays open for hours or days.",
};

const CAPABILITY_JUDGE: Record<string, string> = {
  retrieve_scoped_project_truth: "collect evidence from the project",
  interpret_ambiguous_software_change: "explain what the code change really does",
  analyze_cross_boundary_impact: "trace who and what else is affected",
  evaluate_policy_and_approval_risk: "check company policy and approval rules",
  decompose_route_reconcile: "combine specialist answers into one plan",
  coordinate_frontend_ui_delivery: "prepare customer-visible UI work",
};

const VERDICT_JUDGE: Record<string, string> = {
  guarded_plan: "proceed only with extra approvals and safeguards",
  approve_with_conditions: "approve, but only if listed conditions are met",
  reject: "do not ship as proposed",
  defer: "pause until more evidence or owners weigh in",
};

function scenarioRequestHook(scenario: Scenario | null | undefined): string | null {
  if (!scenario) return null;
  return SCENARIO_REQUEST_HOOKS[scenario.scenario_id] ?? null;
}

function roleDisplayName(role: string): string {
  const labels: Record<string, string> = {
    coordinator: "Coordinator",
    context_scout: "Context Scout",
    change_analyst: "Change Analyst",
    impact_analyst: "Impact Analyst",
    policy_guardian: "Policy Guardian",
    frontend_delivery_lead: "Frontend Delivery",
  };
  return labels[role] ?? role.replaceAll("_", " ");
}

/** Risk label for judges (not protocol jargon). */
export function humanRiskLabel(risk: string): string {
  const r = risk.toLowerCase();
  if (r === "critical") return "Critical risk";
  if (r === "high") return "High risk";
  if (r === "medium") return "Medium risk";
  if (r === "low") return "Low risk";
  return risk ? `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk` : "Risk not rated";
}

export function humanCapabilityLabel(capability: string): string {
  if (!capability) return "—";
  return CAPABILITY_JUDGE[capability] ?? capability.replaceAll("_", " ");
}

function humanVerdict(verdict: string): string {
  const key = verdict.toLowerCase().replaceAll(" ", "_");
  return VERDICT_JUDGE[key] ?? verdict.replaceAll("_", " ");
}

function humanizeTag(text: string): string {
  return text.replaceAll("_", " ").replaceAll("-", " ");
}

export type ScenarioProblemBrief = {
  title: string;
  hook: string;
  userAsk: string;
  stakes: string[];
  policyPressure: string[];
};

export type ExchangeStoryLine = {
  messageId: string;
  phaseId: string;
  stepNumber: number;
  headline: string;
  detail: string;
  riskLevel: string;
};

export type ExchangeStoryPhase = {
  id: string;
  phaseNumber: number;
  title: string;
  intent: string;
  messageIds: string[];
};

export type AgentExchangeStory = {
  problem: ScenarioProblemBrief;
  phases: ExchangeStoryPhase[];
  lines: ExchangeStoryLine[];
  conflictPlain: string | null;
  outcomePlain: string | null;
};

function payloadText(message: AgentMessage): string {
  const p = message.payload ?? {};
  const raw = p.summary ?? p.rationale ?? p.verdict ?? p.intent;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
}

function listFromPayload(message: AgentMessage, key: string, limit = 4): string[] {
  const raw = message.payload?.[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, limit);
}

function phaseForType(type: string): string {
  if (type === "task_assignment") return "assign";
  if (type === "specialist_finding") return "findings";
  if (type.includes("rebuttal")) return "dispute";
  if (type === "coordinator_decision" || type === "approval_requested" || type === "approval_decided") return "decide";
  if (type === "run_completed" || type === "frontend_delivery_handoff") return "finish";
  return "other";
}

const PHASE_META: Record<string, {title: string; intent: string}> = {
  assign: {
    title: "Specialists get their assignment",
    intent: "The Coordinator splits the change into jobs and tells each agent what to investigate.",
  },
  findings: {
    title: "Each specialist answers",
    intent: "Every agent sends back a structured report: what they found, how risky it is, and which evidence they used.",
  },
  dispute: {
    title: "They disagree — on purpose",
    intent: "When two agents rate risk differently, the Coordinator asks them to respond again instead of blending answers.",
  },
  decide: {
    title: "Combined plan and human gate",
    intent: "The Coordinator picks a path forward; risky runs stop here until a person approves, rejects, or asks for edits.",
  },
  finish: {
    title: "Handoff and completion",
    intent: "Optional UI delivery notes and a final “run complete” message close the story.",
  },
  other: {
    title: "Other recorded messages",
    intent: "Additional steps stored for audit.",
  },
};

function assignmentJobText(message: AgentMessage, assignee: string): string {
  const job = humanCapabilityLabel(message.capability);
  return `The Coordinator asked ${assignee} to ${job}.`;
}

function findingDetail(message: AgentMessage, body: string): string {
  const findings = listFromPayload(message, "findings");
  const impacts = listFromPayload(message, "impacts");
  const policies = listFromPayload(message, "policies");
  const parts: string[] = [];
  if (body) parts.push(body);
  if (findings.length) parts.push(`Key point: ${findings.join("; ")}.`);
  if (impacts.length) parts.push(`Areas affected: ${impacts.map(humanizeTag).join(", ")}.`);
  if (policies.length) parts.push(`Policies touched: ${policies.map(humanizeTag).join(", ")}.`);
  const evidence = message.evidence_refs?.length ?? 0;
  if (evidence > 0) parts.push(`Backed by ${evidence} evidence item${evidence === 1 ? "" : "s"}.`);
  return parts.join(" ") || "The specialist returned a structured report to the Coordinator.";
}

export function plainExchangeLine(message: AgentMessage, stepNumber: number): Pick<ExchangeStoryLine, "headline" | "detail"> {
  const from = roleDisplayName(message.sender_role);
  const to =
    message.recipient_role === message.sender_role ? "the team" : roleDisplayName(message.recipient_role);
  const type = message.message_type;
  const body = payloadText(message);
  const risk = humanRiskLabel(message.risk_level);

  switch (type) {
    case "task_assignment":
      return {
        headline: `${from} assigns work to ${to}`,
        detail: assignmentJobText(message, to),
      };
    case "specialist_finding":
      return {
        headline: `${from} answers the Coordinator — ${risk}`,
        detail: findingDetail(message, body),
      };
    case "rebuttal_request":
      return {
        headline: `${from} asks ${to} to explain their position again`,
        detail:
          body ||
          "Two specialists did not agree on how risky this change is. This message opens a short, evidence-based back-and-forth.",
      };
    case "rebuttal_response":
      return {
        headline: `${from} replies after the disagreement — still ${risk.toLowerCase()}`,
        detail: body || "The agent defended or updated their view using evidence, not a vague summary.",
      };
    case "coordinator_decision": {
      const verdictRaw = String(message.payload?.verdict ?? "");
      const verdict = verdictRaw ? humanVerdict(verdictRaw) : "a merged plan";
      return {
        headline: `Coordinator chooses next steps: ${verdict}`,
        detail: body || "Specialist reports are merged into one guarded plan with clear next actions.",
      };
    }
    case "approval_requested":
      return {
        headline: "The run pauses — a person must decide",
        detail:
          body ||
          "Automated agents finished their analysis. A human must approve, reject, or request changes before anything ships.",
      };
    case "approval_decided":
      return {
        headline: "Human decision recorded",
        detail: body || "Who approved or rejected, and why, is stored on this run for audit.",
      };
    case "frontend_delivery_handoff":
      return {
        headline: `${from} sends UI delivery notes to the Coordinator`,
        detail: body || "Customer-visible frontend work is queued when this scenario needs it.",
      };
    case "run_completed":
      return {
        headline: "Run finished",
        detail: body || "All automated steps are done; open Results for scores and the final decision.",
      };
    default:
      return {
        headline: `${from} sends a message to ${to}`,
        detail: body || `Recorded step ${stepNumber} in the agent conversation.`,
      };
  }
}

export function buildScenarioProblemBrief(
  run: SocietyRun,
  scenario: Scenario | null | undefined,
): ScenarioProblemBrief {
  const title = scenario?.title ?? run.scenario_id.replaceAll("-", " ");
  const hook =
    scenarioRequestHook(scenario) ??
    "This demo change looks small on the surface, but revenue, policy, or customer impact may be hidden in the details.";
  const userAsk = run.request_text?.trim() || scenario?.default_request || "No request text on this run.";
  const stakes = scenario?.expected_impacts?.length
    ? scenario.expected_impacts.map(humanizeTag).slice(0, 5)
    : ["Billing, checkout, or customer-facing behavior may change even when the code diff looks minor."];
  const policyPressure = scenario?.governance_rules?.length
    ? scenario.governance_rules.map(humanizeTag).slice(0, 4)
    : (scenario?.required_policies?.map(humanizeTag).slice(0, 4) ?? [
        "Revenue-impacting changes need explicit approval before release.",
      ]);
  return {title, hook, userAsk, stakes, policyPressure};
}

export function buildAgentExchangeStory(
  run: SocietyRun,
  messages: AgentMessage[],
  conflicts: Conflict[],
  scenario?: Scenario | null,
): AgentExchangeStory {
  const sorted = [...messages].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.message_id.localeCompare(b.message_id);
  });

  const problem = buildScenarioProblemBrief(run, scenario);
  const lines: ExchangeStoryLine[] = sorted.map((message, index) => {
    const phaseId = phaseForType(message.message_type);
    const plain = plainExchangeLine(message, index + 1);
    return {
      messageId: message.message_id,
      phaseId,
      stepNumber: index + 1,
      headline: plain.headline,
      detail: plain.detail,
      riskLevel: message.risk_level,
    };
  });

  const phaseOrder = ["assign", "findings", "dispute", "decide", "finish", "other"];
  let phaseNumber = 0;
  const phases: ExchangeStoryPhase[] = phaseOrder
    .map(id => {
      const meta = PHASE_META[id] ?? PHASE_META.other;
      const messageIds = lines.filter(l => l.phaseId === id).map(l => l.messageId);
      if (messageIds.length === 0) return null;
      phaseNumber += 1;
      return {id, phaseNumber, title: meta.title, intent: meta.intent, messageIds};
    })
    .filter((p): p is ExchangeStoryPhase => p !== null);

  const conflict = conflicts[0];
  const conflictPlain = conflict
    ? `Agents disagreed on risk: one side said “${humanRiskLabel(conflict.claim_a_risk).toLowerCase()}”, the other said “${humanRiskLabel(conflict.claim_b_risk).toLowerCase()}”. Why it matters: ${conflict.rationale ?? "The system refused to merge conflicting answers without a human."}`
    : run.conflict_count > 0
      ? "This run includes a recorded disagreement between specialists — see the “They disagree” section below."
      : null;

  const decision = sorted.find(m => m.message_type === "coordinator_decision");
  const completed = sorted.find(m => m.message_type === "run_completed");
  const outcomePlain = completed
    ? `Status: ${run.state.replaceAll("_", " ")}. ${payloadText(completed) || "Open the Results tab for metrics and the approved decision."}`
    : decision
      ? `Coordinator conclusion: ${humanVerdict(String(decision.payload?.verdict ?? "merged plan"))}. ${payloadText(decision) || explainRunStateHint(run.state)}`
      : explainRunStateHint(run.state);

  return {problem, phases, lines, conflictPlain, outcomePlain};
}

function explainRunStateHint(state: string): string {
  if (state === "awaiting_approval") {
    return "Analysis is complete — use the buttons on this tab to approve, reject, or request changes.";
  }
  if (state === "completed") return "The run completed successfully. Compare scores and cost on the Results tab.";
  return `The run is still “${state.replaceAll("_", " ")}”; the timeline below shows every agent message so far.`;
}
