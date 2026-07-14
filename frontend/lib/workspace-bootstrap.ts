import {api} from "@/lib/api";
import type {ManagedAgent, Scenario} from "@/lib/api";
import {createLogger} from "@/lib/app-logger";

const bootLog = createLogger("bootstrap");

export type WorkspaceBootstrapResult = {
  scenarios: Scenario[];
  agents: ManagedAgent[];
  runtimeLabel: string;
  demoAutoApprove: boolean;
  error?: string;
};

/** Initial API probe used by RunWorkspaceProvider (kept separate for testability). */
export async function loadWorkspaceBootstrap(): Promise<WorkspaceBootstrapResult> {
  bootLog.info("bootstrap start");
  const [scenariosRes, agentsRes, readyRes] = await Promise.allSettled([
    api.scenarios(),
    api.agents(),
    api.readiness(),
  ]);

  const scenarios =
    scenariosRes.status === "fulfilled" && Array.isArray(scenariosRes.value) ? scenariosRes.value : [];

  if (scenarios.length === 0) {
    const message =
      scenariosRes.status === "rejected"
        ? scenariosRes.reason instanceof Error
          ? scenariosRes.reason.message
          : "API unavailable"
        : "No demo scenarios returned from the API";
    bootLog.warn("bootstrap failed", {message});
    return {scenarios: [], agents: [], runtimeLabel: "API unavailable", demoAutoApprove: false, error: message};
  }

  const agents =
    agentsRes.status === "fulfilled" && Array.isArray(agentsRes.value) ? agentsRes.value : [];

  let runtimeLabel = "Backend connected";
  let demoAutoApprove = false;
  if (readyRes.status === "fulfilled" && readyRes.value?.checks) {
    const checks = readyRes.value.checks as {model?: {provider?: string}; demo?: {demo_auto_approve?: boolean}};
    if (checks.model?.provider) {
      const provider = checks.model.provider;
      runtimeLabel = provider.includes("qwen") ? "Qwen Cloud (live LLM)" : "Deterministic demo model";
    }
    demoAutoApprove = checks.demo?.demo_auto_approve === true;
  }

  bootLog.info("bootstrap ok", {scenarios: scenarios.length, agents: agents.length, runtimeLabel, demoAutoApprove});
  return {scenarios, agents, runtimeLabel, demoAutoApprove};
}
