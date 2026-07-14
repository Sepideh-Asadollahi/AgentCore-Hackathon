export type ApiAccessMode = "proxy" | "direct";

/** Runtime client config. Workspace connection fields are fixed defaults (not user-editable). */
export type ClientSettings = {
  apiMode: ApiAccessMode;
  apiBaseUrl: string;
  projectId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  llmBaseUrl: string;
  llmModel: string;
  /** Session-only in the form; never persisted to localStorage. */
  llmApiKey: string;
  debugLogging: boolean;
};

const STORAGE_KEY = "change-society-client-settings";

const DEFAULT_LLM_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/** Fixed demo scope + API routing (env may override IDs / direct URL at build time). */
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

function defaultDebugLogging(): boolean {
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "false") return false;
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "true") return true;
  return process.env.NODE_ENV === "development";
}

type PersistedClientPreferences = {
  llmBaseUrl?: string;
  llmModel?: string;
  debugLogging?: boolean;
};

export function loadClientSettings(): ClientSettings {
  const defaults = buildDefaultClientSettings();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as PersistedClientPreferences & Partial<ClientSettings>;
    return {
      ...defaults,
      llmBaseUrl: (parsed.llmBaseUrl ?? defaults.llmBaseUrl).trim() || defaults.llmBaseUrl,
      llmModel: (parsed.llmModel ?? defaults.llmModel).trim() || defaults.llmModel,
      llmApiKey: "",
      debugLogging: typeof parsed.debugLogging === "boolean" ? parsed.debugLogging : defaults.debugLogging,
    };
  } catch {
    return defaults;
  }
}

export function saveClientSettings(settings: ClientSettings): void {
  const prefs: PersistedClientPreferences = {
    llmBaseUrl: settings.llmBaseUrl.trim(),
    llmModel: settings.llmModel.trim(),
    debugLogging: Boolean(settings.debugLogging),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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
  return validateLlmClientFields(settings);
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
  const base = buildDefaultClientSettings();
  return {
    ...base,
    llmBaseUrl: form.llmBaseUrl.trim(),
    llmModel: form.llmModel.trim(),
    llmApiKey: form.llmApiKey,
    debugLogging: Boolean(form.debugLogging),
  };
}

/** Reference .env lines for operators (never includes a browser-stored key). */
export function buildHackathonEnvSnippet(settings: ClientSettings): string {
  return [
    "CHANGE_SOCIETY_MODEL_PROVIDER=fake",
    `QWEN_BASE_URL=${settings.llmBaseUrl.trim()}`,
    `QWEN_MODEL=${settings.llmModel.trim()}`,
    "QWEN_API_KEY=<use Save key & restart worker in Settings — stored in PostgreSQL>",
  ].join("\n");
}

export function settingsEqual(a: ClientSettings, b: ClientSettings): boolean {
  return (
    a.llmBaseUrl === b.llmBaseUrl &&
    a.llmModel === b.llmModel &&
    a.debugLogging === b.debugLogging
  );
}

export {STORAGE_KEY};
