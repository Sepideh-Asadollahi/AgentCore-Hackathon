export type Scenario = {
  scenario_id: string; title: string; default_request: string; evidence_count: number;
  domain: string; governance_rules: string[]; feature_demonstrations: string[];
  expected_impacts: string[]; required_policies: string[]; required_tasks: string[];
  requires_negotiation: boolean;
};

export type OrgPolicyCandidate = {
  candidate_id: string; policy_tag: string; title: string; policy_text: string;
  source: string; risk: string; confidence: number;
};

export type OrgPolicyChallengeOption = {option_id: string; label: string; outcome: string};

export type OrgPolicyChallenge = {
  challenge_id: string; sequence: number; type: string; title: string; summary: string;
  linked_candidate_ids: string[]; options: OrgPolicyChallengeOption[];
  default_recommendation: string; resolved: boolean;
  resolution: null | {option_id: string};
};

export type OrgPolicyIntakeSession = {
  intake_session_id: string; scenario_id: string; state: string;
  requirements_digest: string[]; coverage_map: Record<string, unknown>;
  candidate_policies: OrgPolicyCandidate[]; challenges: OrgPolicyChallenge[];
  activated_policies?: {evidence_id: string; policy_tag: string; title: string; llm_managed_summary?: string}[];
};

export type SocietyRun = {
  run_id: string; state: string; version: number; request_text: string; scenario_id: string;
  message_count: number; conflict_count: number; approval: null | {status: string};
  final_result: null | Record<string, unknown>; metrics: Record<string, number | object>;
  excluded_evidence: {evidence_id: string; reason: string}[]; correlation_id: string;
};

export type AgentMessage = {
  message_id: string; message_type: string; sender_role: string; recipient_role: string;
  capability: string; risk_level: string; payload: Record<string, unknown>; evidence_refs: string[];
  token_usage: Record<string, number>;
};

export type Conflict = {
  conflict_id: string; topic: string; claim_a_risk: string; claim_b_risk: string;
  status: string; resolution?: string; rationale?: string; rebuttal_message_ids: string[];
};

export type ManagedAgent = {
  agent_id: string; name: string; provider: string; adapter_type: string; capabilities: string[];
  state: string; description: string; active_ticket_count: number; version: number;
};

export type AgentTicket = {
  ticket_id: string; run_id: string; title: string; capability: string; state: string;
  assigned_agent_id: string | null; version: number; execution_metrics: Record<string, unknown>;
  events: {event_id: string; from_state: string | null; to_state: string; actor_id: string; occurred_at: string}[];
};

export type FrontendDelivery = {
  run_id: string;
  scenario_id: string;
  team_queue: string;
  frontend_work_required: boolean;
  signals: Record<string, unknown> | null;
  tickets: AgentTicket[];
  handoff_message: AgentMessage | null;
  metrics: Record<string, unknown>;
};

const baseUrl = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_API_URL ?? "http://localhost:32500";
const projectId = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID ?? "demo-project";
const stableHeaders = {
  "Content-Type": "application/json",
  "X-Tenant-Id": process.env.NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID ?? "demo-tenant",
  "X-Workspace-Id": process.env.NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID ?? "demo-workspace",
  "X-Actor-Id": "demo-engineering-lead",
};

export function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as {error?: {message?: string}}).error;
    if (error?.message) return error.message;
  }
  return `Request failed with ${status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {...init, headers: {...stableHeaders, ...init?.headers}, cache: "no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(parseApiError(data, response.status));
  return data as T;
}

const projectPath = `/api/v1/projects/${encodeURIComponent(projectId)}`;

type ReadinessResponse = {
  status: string;
  checks?: {model?: {provider?: string; configured?: boolean}};
};

export const api = {
  readiness: async () => request<ReadinessResponse>(`/ready`),
  scenarios: async () => (await request<{items: Scenario[]}>(`${projectPath}/demo-scenarios`)).items,
  agents: async () => (await request<{items: ManagedAgent[]}>(`${projectPath}/managed-agents?page_size=100`)).items,
  createRun: async (scenario_id: string, request_text: string) => (await request<{society_run: SocietyRun; correlation_id?: string}>(`${projectPath}/society-runs`, {
    method: "POST", headers: {"Idempotency-Key": crypto.randomUUID()}, body: JSON.stringify({scenario_id, request_text}),
  })).society_run,
  getRun: async (runId: string) => (await request<{society_run: SocietyRun}>(`${projectPath}/society-runs/${runId}`)).society_run,
  messages: async (runId: string) => (await request<{items: AgentMessage[]}>(`${projectPath}/society-runs/${runId}/agent-messages?page_size=100`)).items,
  conflicts: async (runId: string) => (await request<{items: Conflict[]}>(`${projectPath}/society-runs/${runId}/conflicts?page_size=100`)).items,
  tickets: async (runId: string) => (await request<{items: AgentTicket[]}>(`${projectPath}/agent-tickets?run_id=${encodeURIComponent(runId)}&page_size=100`)).items,
  frontendDelivery: async (runId: string) =>
    (await request<{delivery: FrontendDelivery}>(`${projectPath}/society-runs/${runId}/frontend-delivery`)).delivery,
  decide: async (run: SocietyRun, action: "approve" | "reject" | "request-changes", reason: string) => {
    const command = action === "request-changes" ? "request-changes" : action;
    return (await request<{society_run: SocietyRun}>(`${projectPath}/society-runs/${run.run_id}:${command}`, {
      method: "POST", headers: {"Idempotency-Key": crypto.randomUUID()}, body: JSON.stringify({reason, expected_version: run.version}),
    })).society_run;
  },
  evaluate: async (runId: string) => (await request<{evaluation: Record<string, unknown>}>(`${projectPath}/society-runs/${runId}:evaluate-baseline`, {method: "POST"})).evaluation,
  analyzeOrgPolicyIntake: async (scenario_id: string, process_narrative: string, constraints = "") =>
    (await request<{intake_session: OrgPolicyIntakeSession}>(`${projectPath}/org-policy-intake:analyze`, {
      method: "POST", body: JSON.stringify({scenario_id, process_narrative, constraints}),
    })).intake_session,
  resolveOrgPolicyChallenge: async (sessionId: string, challengeId: string, optionId: string) =>
    (await request<{intake_session: OrgPolicyIntakeSession}>(
      `${projectPath}/org-policy-intake/${encodeURIComponent(sessionId)}/challenges/${encodeURIComponent(challengeId)}:resolve`,
      {method: "POST", body: JSON.stringify({option_id: optionId})},
    )).intake_session,
  activateOrgPolicyIntake: async (sessionId: string, adopted_candidate_ids: string[]) =>
    request<{intake_session: OrgPolicyIntakeSession; activated_policies: {evidence_id: string; policy_tag: string; title: string}[]}>(
      `${projectPath}/org-policy-intake/${encodeURIComponent(sessionId)}:activate`,
      {method: "POST", body: JSON.stringify({adopted_candidate_ids})},
    ),
  listOrgPolicies: async () => (await request<{items: {evidence_id: string; policy_tag: string; title: string}[]}>(`${projectPath}/org-policies`)).items,
};
