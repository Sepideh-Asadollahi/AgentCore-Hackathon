"use server";

import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {randomUUID} from "crypto";
import {RUN_ACTIVE_COOKIE, RUN_LATEST_COOKIE} from "@/lib/server-change-society";

const API_BASE = process.env.CHANGE_SOCIETY_PROXY_TARGET ?? "http://127.0.0.1:32500";
const PROJECT = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID?.trim() || "demo-project";

export async function startSocietyRunAction(formData: FormData): Promise<void> {
  const scenario_id = String(formData.get("scenario_id") ?? "").trim();
  const request_text = String(formData.get("request_text") ?? "").trim();
  if (!scenario_id) {
    throw new Error("Scenario is required.");
  }

  const url = `${API_BASE.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(PROJECT)}/society-runs`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": process.env.NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID?.trim() || "demo-tenant",
      "X-Workspace-Id": process.env.NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID?.trim() || "demo-workspace",
      "X-Actor-Id": "demo-engineering-lead",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(request_text ? {scenario_id, request_text} : {scenario_id}),
    cache: "no-store",
  });

  const raw = await response.text();
  let payload: {society_run?: {run_id?: string}; error?: {message?: string}} = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw new Error(`API returned non-JSON (${response.status}).`);
    }
  }

  if (!response.ok) {
    const message = payload.error?.message ?? `Start run failed (${response.status}).`;
    throw new Error(message);
  }

  const runId = payload.society_run?.run_id;
  const jar = await cookies();
  if (runId) {
    const opts = {path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" as const};
    jar.set(RUN_ACTIVE_COOKIE, runId, opts);
    jar.set(RUN_LATEST_COOKIE, runId, opts);
    redirect(`/agents?run=${encodeURIComponent(runId)}&tab=guide`);
  }
  redirect("/agents");
}
