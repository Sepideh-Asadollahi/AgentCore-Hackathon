export type ApiAccessMode = "proxy" | "direct";

/** Browser-only overrides for API connectivity, scope headers, and LLM connection (localStorage). */
export type ClientSettings = {
  apiMode: ApiAccessMode;
  apiBaseUrl: string;
  projectId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  /** Verbose browser console logs (API, workspace, bootstrap). */
  debugLogging: boolean;
};

const STORAGE_KEY = "change-society-client-settings";

const DEFAULT_LLM_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function defaultDebugLogging(): boolean {
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "false") return false;
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function buildDefaultClientSettings(): ClientSettings {
  const proxyDisabled = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_USE_PROXY === "false";
  return {
    apiMode: proxyDisabled ? "direct" : "proxy",
    apiBaseUrl: process.env.NEXT_PUBLIC_CHANGE_SOCIETY_API_URL?.trim() || "http://localhost:32500",
    projectId: process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID?.trim() || "demo-project",
    tenantId: process.env.NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID?.trim() || "demo-tenant",
    workspaceId: process.env.NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID?.trim() || "demo-workspace",
    actorId: "demo-engineering-lead",
    llmBaseUrl: process.env.NEXT_PUBLIC_QWEN_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL,
    llmModel: process.env.NEXT_PUBLIC_QWEN_MODEL?.trim() || "qwen-plus",
    llmApiKey: "",
    debugLogging: defaultDebugLogging(),
  };
}

export function loadClientSettings(): ClientSettings {
  const defaults = buildDefaultClientSettings();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ClientSettings>;
    return {
      ...defaults,
      ...parsed,
      apiMode: parsed.apiMode === "direct" ? "direct" : "proxy",
      llmBaseUrl: (parsed.llmBaseUrl ?? defaults.llmBaseUrl).trim() || defaults.llmBaseUrl,
      llmModel: (parsed.llmModel ?? defaults.llmModel).trim() || defaults.llmModel,
      llmApiKey: typeof parsed.llmApiKey === "string" ? parsed.llmApiKey : "",
      debugLogging: typeof parsed.debugLogging === "boolean" ? parsed.debugLogging : defaults.debugLogging,
    };
  } catch {
    return defaults;
  }
}

export function saveClientSettings(settings: ClientSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearClientSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function effectiveApiBasePreview(settings: ClientSettings): string {
  if (settings.apiMode === "proxy") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/change-society-api`;
    }
    return "/change-society-api";
  }
  return settings.apiBaseUrl.replace(/\/$/, "") || "http://localhost:32500";
}

export type ClientSettingsValidation = {
  ok: boolean;
  message?: string;
};

export function validateClientSettings(settings: ClientSettings): ClientSettingsValidation {
  if (!settings.projectId.trim()) return {ok: false, message: "Project ID is required."};
  if (!settings.tenantId.trim()) return {ok: false, message: "Tenant ID is required."};
  if (!settings.workspaceId.trim()) return {ok: false, message: "Workspace ID is required."};
  if (!settings.actorId.trim()) return {ok: false, message: "Actor ID is required."};
  if (settings.apiMode === "direct") {
    const url = settings.apiBaseUrl.trim();
    if (!url) return {ok: false, message: "API base URL is required in direct mode."};
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {ok: false, message: "API base URL must use http or https."};
      }
    } catch {
      return {ok: false, message: "API base URL is not valid."};
    }
  }
  const llm = validateLlmClientFields(settings);
  if (!llm.ok) return llm;
  return {ok: true};
}

export function validateLlmClientFields(settings: ClientSettings): ClientSettingsValidation {
  const base = settings.llmBaseUrl.trim();
  const model = settings.llmModel.trim();
  if (!base) return {ok: false, message: "LLM base URL is required."};
  if (!model) return {ok: false, message: "LLM model name is required."};
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {ok: false, message: "LLM base URL must use http or https."};
    }
  } catch {
    return {ok: false, message: "LLM base URL is not valid."};
  }
  return {ok: true};
}

export function normalizeClientSettings(form: ClientSettings): ClientSettings {
  return {
    apiMode: form.apiMode,
    apiBaseUrl: form.apiBaseUrl.trim(),
    projectId: form.projectId.trim(),
    tenantId: form.tenantId.trim(),
    workspaceId: form.workspaceId.trim(),
    actorId: form.actorId.trim(),
    llmBaseUrl: form.llmBaseUrl.trim(),
    llmModel: form.llmModel.trim(),
    llmApiKey: form.llmApiKey,
    debugLogging: Boolean(form.debugLogging),
  };
}

/** Lines to paste into hackathon/.env (persisted server config; requires API restart). */
export function buildHackathonEnvSnippet(settings: ClientSettings): string {
  const lines = [
    "CHANGE_SOCIETY_MODEL_PROVIDER=qwen",
    `QWEN_BASE_URL=${settings.llmBaseUrl.trim()}`,
    `QWEN_MODEL=${settings.llmModel.trim()}`,
  ];
  if (settings.llmApiKey.trim()) {
    lines.push(`QWEN_API_KEY=${settings.llmApiKey.trim()}`);
  } else {
    lines.push("QWEN_API_KEY=");
  }
  return lines.join("\n");
}

export function settingsEqual(a: ClientSettings, b: ClientSettings): boolean {
  return (
    a.apiMode === b.apiMode &&
    a.apiBaseUrl.trim() === b.apiBaseUrl.trim() &&
    a.projectId.trim() === b.projectId.trim() &&
    a.tenantId.trim() === b.tenantId.trim() &&
    a.workspaceId.trim() === b.workspaceId.trim() &&
    a.actorId.trim() === b.actorId.trim() &&
    a.llmBaseUrl.trim() === b.llmBaseUrl.trim() &&
    a.llmModel.trim() === b.llmModel.trim() &&
    a.llmApiKey === b.llmApiKey &&
    a.debugLogging === b.debugLogging
  );
}

export {STORAGE_KEY};
