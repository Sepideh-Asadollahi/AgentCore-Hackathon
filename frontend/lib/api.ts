import {createIdempotencyKey} from "./idempotency-key";

export type Scenario = {
  scenario_id: string; title: string; default_request: string; judge_demo_request: string; evidence_count: number;
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
  message_count: number; conflict_count: number; approval: null | {status: string; reason?: string; decided_by?: string};
  final_result: null | Record<string, unknown>; metrics: Record<string, number | object>;
  excluded_evidence: {evidence_id: string; reason: string}[]; correlation_id: string;
  created_at?: string; updated_at?: string;
};

export type AgentMessage = {
  message_id: string; message_type: string; sender_role: string; recipient_role: string;
  capability: string; risk_level: string; payload: Record<string, unknown>; evidence_refs: string[];
  token_usage: Record<string, number>;
  created_at?: string;
  causation_id?: string | null;
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

import {getApiBaseUrl} from "./api-base-url";
import {loadClientSettings} from "./client-settings";
import {createLogger} from "./app-logger";

const apiLog = createLogger("api");

function requestContext() {
  const settings = typeof window !== "undefined" ? loadClientSettings() : null;
  const projectId =
    settings?.projectId.trim() ||
    process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID?.trim() ||
    "demo-project";
  return {
    baseUrl: getApiBaseUrl(settings ?? undefined),
    projectPath: `/api/v1/projects/${encodeURIComponent(projectId)}`,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id":
        settings?.tenantId.trim() || process.env.NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID?.trim() || "demo-tenant",
      "X-Workspace-Id":
        settings?.workspaceId.trim() ||
        process.env.NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID?.trim() ||
        "demo-workspace",
      "X-Actor-Id": settings?.actorId.trim() || "demo-engineering-lead",
    },
  };
}

export function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as {error?: {message?: string}}).error;
    if (error?.message) return error.message;
  }
  return `Request failed with ${status}`;
}

export function parseApiErrorCode(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    return (data as {error?: {code?: string}}).error?.code;
  }
  return undefined;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function isSocietyRunNotFoundError(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    return err.status === 404 || err.code === "society_run_not_found";
  }
  if (err instanceof Error) {
    return /society run was not found/i.test(err.message) || /society_run_not_found/i.test(err.message);
  }
  return false;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctx = requestContext();
  const method = init?.method ?? "GET";
  const started = typeof performance !== "undefined" ? performance.now() : 0;
  apiLog.debug("fetch", {method, path, baseUrl: ctx.baseUrl});
  let response: Response;
  try {
    response = await fetch(`${ctx.baseUrl}${path}`, {
      ...init,
      headers: {...ctx.headers, ...init?.headers},
      cache: "no-store",
    });
  } catch (cause) {
    const hint =
      ctx.baseUrl.startsWith("/")
        ? `Start the API on port 32500 on this host (e.g. \`python run.py\` in hackathon/) so the UI proxy ${ctx.baseUrl} can reach it.`
        : `Cannot reach ${ctx.baseUrl}. Confirm change-society-service is listening on 0.0.0.0:32500 and firewall allows the port.`;
    const detail = cause instanceof Error ? cause.message : "network error";
    apiLog.error("fetch failed", {method, path, detail});
    throw new Error(`${hint} (${detail})`);
  }
  const raw = await response.text();
  const ms = typeof performance !== "undefined" ? Math.round(performance.now() - started) : undefined;
  let data: unknown = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      apiLog.error("non-json response", {method, path, status: response.status, ms});
      throw new Error(`API returned non-JSON (${response.status}) from ${ctx.baseUrl}${path}`);
    }
  }
  if (!response.ok) {
    const message = parseApiError(data, response.status);
    const code = parseApiErrorCode(data);
    apiLog.warn("api error", {method, path, status: response.status, ms, message, code});
    throw new ApiRequestError(message, response.status, code);
  }
  apiLog.debug("fetch ok", {method, path, status: response.status, ms});
  return data as T;
}

export type ConnectionProbe = {
  ok: boolean;
  baseUrl: string;
  readyStatus?: string;
  scenarioCount?: number;
  modelProvider?: string;
  modelName?: string;
  modelBaseUrl?: string;
  modelConfigured?: boolean;
  error?: string;
};

/** Lightweight health check for Settings and diagnostics (uses current client settings). */
export async function probeConnection(): Promise<ConnectionProbe> {
  const ctx = requestContext();
  apiLog.info("probe start", {baseUrl: ctx.baseUrl});
  try {
    const readyRes = await fetch(`${ctx.baseUrl}/ready`, {headers: ctx.headers, cache: "no-store"});
    const readyRaw = await readyRes.text();
    let readyJson: Partial<ReadinessResponse> = {};
    if (readyRaw) readyJson = JSON.parse(readyRaw) as ReadinessResponse;
    if (!readyRes.ok) {
      return {
        ok: false,
        baseUrl: ctx.baseUrl,
        error: parseApiError(readyJson, readyRes.status),
      };
    }
    const scenariosRes = await fetch(`${ctx.baseUrl}${ctx.projectPath}/demo-scenarios`, {
      headers: ctx.headers,
      cache: "no-store",
    });
    const scenariosRaw = await scenariosRes.text();
    let count = 0;
    if (scenariosRes.ok && scenariosRaw) {
      const parsed = JSON.parse(scenariosRaw) as {items?: unknown[]};
      count = parsed.items?.length ?? 0;
    }
    if (!scenariosRes.ok) {
      let errPayload: unknown = {};
      try {
        errPayload = scenariosRaw ? JSON.parse(scenariosRaw) : {};
      } catch {
        errPayload = {};
      }
      return {
        ok: false,
        baseUrl: ctx.baseUrl,
        readyStatus: readyJson.status,
        error: parseApiError(errPayload, scenariosRes.status),
      };
    }
    return {
      ok: count > 0,
      baseUrl: ctx.baseUrl,
      readyStatus: readyJson.status,
      scenarioCount: count,
      modelProvider: readyJson.checks?.model?.provider,
      modelName: readyJson.checks?.model?.model,
      modelBaseUrl: readyJson.checks?.model?.base_url,
      modelConfigured: readyJson.checks?.model?.configured,
      error: count > 0 ? undefined : "API reachable but demo-scenarios list is empty.",
    };
  } catch (err) {
    apiLog.warn("probe failed", {error: err instanceof Error ? err.message : "unknown"});
    return {
      ok: false,
      baseUrl: ctx.baseUrl,
      error: err instanceof Error ? err.message : "Connection probe failed",
    };
  }
}

function projectPath(): string {
  return requestContext().projectPath;
}

type ReadinessResponse = {
  status: string;
  checks?: {
    model?: {provider?: string; configured?: boolean; model?: string; base_url?: string};
  };
};

export type DevLlmApplyResult = {ok: boolean; message: string};

/** Development-only: push LLM base URL, model, and API key to the running API (Qwen client). */
export async function applyDevLlmConnection(settings: {
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
}): Promise<DevLlmApplyResult> {
  const ctx = requestContext();
  try {
    const response = await fetch(`${ctx.baseUrl}/api/v1/hackathon/dev/llm-connection`, {
      method: "POST",
      headers: {...ctx.headers, "Content-Type": "application/json"},
      cache: "no-store",
      body: JSON.stringify({
        base_url: settings.llmBaseUrl.trim(),
        model: settings.llmModel.trim(),
        api_key: settings.llmApiKey.trim(),
      }),
    });
    const raw = await response.text();
    let data: {message?: string; error?: {message?: string}} = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        return {ok: false, message: `API returned non-JSON (${response.status}).`};
      }
    }
    if (!response.ok) {
      const err = data.error?.message ?? parseApiError(data, response.status);
      apiLog.warn("dev llm apply failed", {status: response.status, message: err});
      return {ok: false, message: err};
    }
    apiLog.info("dev llm apply ok");
    return {ok: true, message: (data as {message?: string}).message ?? "LLM connection applied."};
  } catch (err) {
    apiLog.error("dev llm apply error", {error: err instanceof Error ? err.message : "unknown"});
    return {ok: false, message: err instanceof Error ? err.message : "Apply failed"};
  }
}

export {getApiBaseUrl} from "./api-base-url";

export const api = {
  readiness: async () => request<ReadinessResponse>(`/ready`),
  scenarios: async () => {
    const body = await request<{items?: Scenario[]} | Scenario[]>(`${projectPath()}/demo-scenarios`);
    if (Array.isArray(body)) return body;
    return body.items ?? [];
  },
  agents: async () => {
    const body = await request<{items?: ManagedAgent[]}>(`${projectPath()}/managed-agents?page_size=100`);
    return body.items ?? [];
  },
  createRun: async (scenario_id: string, request_text?: string | null) => {
    const path = `${projectPath()}/society-runs`;
    const trimmed = request_text?.trim() ?? "";
    const bodyPayload =
      trimmed.length > 0 ? {scenario_id, request_text: trimmed} : {scenario_id};
    apiLog.info("createRun", {path, scenario_id, requestLen: trimmed.length});
    const body = await request<{society_run: SocietyRun; correlation_id?: string}>(path, {
      method: "POST", headers: {"Idempotency-Key": createIdempotencyKey()}, body: JSON.stringify(bodyPayload),
    });
    apiLog.info("createRun ok", {runId: body.society_run.run_id, state: body.society_run.state});
    return body.society_run;
  },
  getRun: async (runId: string) => (await request<{society_run: SocietyRun}>(`${projectPath()}/society-runs/${runId}`)).society_run,
  latestRunForScenario: async (scenarioId: string) =>
    (await request<{society_run: SocietyRun}>(`${projectPath()}/demo-scenarios/${encodeURIComponent(scenarioId)}/latest-society-run`))
      .society_run,
  messages: async (runId: string) => (await request<{items: AgentMessage[]}>(`${projectPath()}/society-runs/${runId}/agent-messages?page_size=100`)).items,
  conflicts: async (runId: string) => (await request<{items: Conflict[]}>(`${projectPath()}/society-runs/${runId}/conflicts?page_size=100`)).items,
  tickets: async (runId: string) => (await request<{items: AgentTicket[]}>(`${projectPath()}/agent-tickets?run_id=${encodeURIComponent(runId)}&page_size=100`)).items,
  frontendDelivery: async (runId: string) =>
    (await request<{delivery: FrontendDelivery}>(`${projectPath()}/society-runs/${runId}/frontend-delivery`)).delivery,
  decide: async (run: SocietyRun, action: "approve" | "reject" | "request-changes", reason: string) => {
    const command = action === "request-changes" ? "request-changes" : action;
    return (await request<{society_run: SocietyRun}>(`${projectPath()}/society-runs/${run.run_id}:${command}`, {
      method: "POST", headers: {"Idempotency-Key": createIdempotencyKey()}, body: JSON.stringify({reason, expected_version: run.version}),
    })).society_run;
  },
  evaluate: async (runId: string) => (await request<{evaluation: Record<string, unknown>}>(`${projectPath()}/society-runs/${runId}:evaluate-baseline`, {method: "POST"})).evaluation,
  analyzeOrgPolicyIntake: async (scenario_id: string, process_narrative: string, constraints = "") =>
    (await request<{intake_session: OrgPolicyIntakeSession}>(`${projectPath()}/org-policy-intake:analyze`, {
      method: "POST", body: JSON.stringify({scenario_id, process_narrative, constraints}),
    })).intake_session,
  resolveOrgPolicyChallenge: async (sessionId: string, challengeId: string, optionId: string) =>
    (await request<{intake_session: OrgPolicyIntakeSession}>(
      `${projectPath()}/org-policy-intake/${encodeURIComponent(sessionId)}/challenges/${encodeURIComponent(challengeId)}:resolve`,
      {method: "POST", body: JSON.stringify({option_id: optionId})},
    )).intake_session,
  activateOrgPolicyIntake: async (sessionId: string, adopted_candidate_ids: string[]) =>
    request<{intake_session: OrgPolicyIntakeSession; activated_policies: {evidence_id: string; policy_tag: string; title: string}[]}>(
      `${projectPath()}/org-policy-intake/${encodeURIComponent(sessionId)}:activate`,
      {method: "POST", body: JSON.stringify({adopted_candidate_ids})},
    ),
  listOrgPolicies: async () => (await request<{items: {evidence_id: string; policy_tag: string; title: string}[]}>(`${projectPath()}/org-policies`)).items,
};
