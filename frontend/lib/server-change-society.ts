import type {AgentMessage, AgentTicket, Conflict, ManagedAgent, Scenario, SocietyRun} from "@/lib/api";
import {createLogger} from "@/lib/app-logger";
import {shouldPollSocietyRun} from "@/lib/demo-state";

const serverLog = createLogger("ssr");

const API_BASE = process.env.CHANGE_SOCIETY_PROXY_TARGET ?? "http://127.0.0.1:32500";
const PROJECT = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID ?? "demo-project";
const TENANT = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID ?? "demo-tenant";
const WORKSPACE = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID ?? "demo-workspace";

export const RUN_ACTIVE_COOKIE = "change-society-active-run";
export const RUN_LATEST_COOKIE = "change-society-latest-run";

function apiHeaders(): Record<string, string> {
  return {
    "X-Tenant-Id": TENANT,
    "X-Workspace-Id": WORKSPACE,
  };
}

function projectPrefix(): string {
  return `${API_BASE.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(PROJECT)}`;
}

export type RunSnapshotServer = {
  run: SocietyRun;
  tickets: AgentTicket[];
  messages: AgentMessage[];
  agents: ManagedAgent[];
  conflicts: Conflict[];
};

/** Server-side society run snapshot (works without browser JS / hydration). */
export async function fetchRunSnapshotServer(runId: string): Promise<RunSnapshotServer | null> {
  const prefix = projectPrefix();
  const headers = apiHeaders();
  try {
    serverLog.debug("fetch run snapshot", {runId});
    const runRes = await fetch(`${prefix}/society-runs/${encodeURIComponent(runId)}`, {
      headers,
      cache: "no-store",
    });
    if (!runRes.ok) {
      serverLog.warn("fetch run failed", {runId, status: runRes.status});
      return null;
    }

    const runBody = (await runRes.json()) as {society_run: SocietyRun};
    const [ticketRes, messageRes, agentRes, conflictRes] = await Promise.all([
      fetch(`${prefix}/agent-tickets?run_id=${encodeURIComponent(runId)}&page_size=100`, {headers, cache: "no-store"}),
      fetch(`${prefix}/society-runs/${encodeURIComponent(runId)}/agent-messages?page_size=100`, {headers, cache: "no-store"}),
      fetch(`${prefix}/managed-agents?page_size=100`, {headers, cache: "no-store"}),
      fetch(`${prefix}/society-runs/${encodeURIComponent(runId)}/conflicts?page_size=100`, {headers, cache: "no-store"}),
    ]);

    const ticketBody = ticketRes.ok ? ((await ticketRes.json()) as {items?: AgentTicket[]}) : {items: []};
    const messageBody = messageRes.ok ? ((await messageRes.json()) as {items?: AgentMessage[]}) : {items: []};
    const agentBody = agentRes.ok ? ((await agentRes.json()) as {items?: ManagedAgent[]}) : {items: []};
    const conflictBody = conflictRes.ok ? ((await conflictRes.json()) as {items?: Conflict[]}) : {items: []};

    const snapshot: RunSnapshotServer = {
      run: runBody.society_run,
      tickets: ticketBody.items ?? [],
      messages: messageBody.items ?? [],
      agents: agentBody.items ?? [],
      conflicts: conflictBody.items ?? [],
    };
    serverLog.info("fetch run snapshot ok", {
      runId,
      state: snapshot.run.state,
      tickets: snapshot.tickets.length,
      messages: snapshot.messages.length,
    });
    return snapshot;
  } catch (err) {
    serverLog.error("fetch run snapshot error", {runId, error: err instanceof Error ? err.message : "unknown"});
    return null;
  }
}

export function shouldAutoRefreshRunPage(state: string): boolean {
  return shouldPollSocietyRun(state);
}

/** Server-side demo-scenarios fetch (SSR + force-dynamic layout). */
export async function fetchDemoScenariosServer(): Promise<Scenario[]> {
  try {
    const url = `${projectPrefix()}/demo-scenarios`;
    serverLog.debug("fetch scenarios", {url});
    const res = await fetch(url, {headers: apiHeaders(), cache: "no-store"});
    if (!res.ok) {
      serverLog.warn("fetch scenarios failed", {status: res.status});
      return [];
    }
    const body = (await res.json()) as {items?: Scenario[]};
    const count = body.items?.length ?? 0;
    serverLog.info("fetch scenarios ok", {count});
    return body.items ?? [];
  } catch (err) {
    serverLog.error("fetch scenarios error", {error: err instanceof Error ? err.message : "unknown"});
    return [];
  }
}
