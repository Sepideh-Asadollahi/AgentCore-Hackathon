"use client";

import {useEffect, useMemo, useState} from "react";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {WorkspaceSelect} from "@/components/workspace/WorkspaceSelect";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {probeConnection, applyDevLlmConnection, applyJudgeRuntimeConfig, fetchJudgeRuntimeStatus, type ConnectionProbe, type JudgeRuntimeStatus} from "@/lib/api";
import {useRunWorkspace} from "@/lib/run-workspace";
import {
  buildDefaultClientSettings,
  buildHackathonEnvSnippet,
  clearClientSettings,
  effectiveApiBasePreview,
  loadClientSettings,
  normalizeClientSettings,
  saveClientSettings,
  validateClientSettings,
  type ClientSettings,
} from "@/lib/client-settings";
import {configureAppLogging} from "@/lib/app-logger";
import {
  panelClass,
  wsAlertWarn,
  wsFieldControl,
  wsFieldLabel,
  wsGridSingle,
  wsLead,
  wsMeta,
  wsPanelTitle,
  wsStep,
} from "@/lib/workspace-ui";

export default function SettingsPage() {
  const ws = useRunWorkspace();
  const [form, setForm] = useState<ClientSettings>(() =>
    typeof window !== "undefined" ? loadClientSettings() : buildDefaultClientSettings(),
  );
  const [error, setError] = useState("");
  const [savedPendingReload, setSavedPendingReload] = useState(false);
  const [probe, setProbe] = useState<ConnectionProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [llmApplyMessage, setLlmApplyMessage] = useState("");
  const [applyingLlm, setApplyingLlm] = useState(false);
  const [applyingJudgeRuntime, setApplyingJudgeRuntime] = useState(false);
  const [serverRuntime, setServerRuntime] = useState<JudgeRuntimeStatus | null>(null);

  const envSnippet = useMemo(() => buildHackathonEnvSnippet(form), [form]);
  const inProcessQwen =
    probe?.modelProvider === "qwen_cloud" || probe?.modelProvider === "qwen" || serverRuntime?.model_provider === "qwen";

  useEffect(() => {
    setForm(loadClientSettings());
    let cancelled = false;
    void (async () => {
      setProbing(true);
      const [result, runtime] = await Promise.all([probeConnection(), fetchJudgeRuntimeStatus()]);
      if (!cancelled) {
        setProbe(result);
        setServerRuntime(runtime);
        setProbing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveApi = useMemo(() => effectiveApiBasePreview(form), [form]);

  function update<K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) {
    setForm(prev => {
      const next = {...prev, [key]: value};
      if (key === "debugLogging") configureAppLogging(next);
      return next;
    });
    setSavedPendingReload(false);
    setError("");
  }

  function handleSave() {
    const validation = validateClientSettings(form);
    if (!validation.ok) {
      setError(validation.message ?? "Invalid settings.");
      return;
    }
    const normalized = normalizeClientSettings(form);
    saveClientSettings(normalized);
    setForm({...normalized, llmApiKey: ""});
    configureAppLogging(normalized);
    setSavedPendingReload(true);
    setError("");
  }

  function handleReset() {
    clearClientSettings();
    const defaults = buildDefaultClientSettings();
    setForm(defaults);
    setSavedPendingReload(true);
    setError("");
    setProbe(null);
  }

  async function handleTestConnection() {
    setProbing(true);
    setProbe(null);
    const validation = validateClientSettings(form);
    if (!validation.ok) {
      setError(validation.message ?? "Fix validation errors before testing.");
      setProbing(false);
      return;
    }
    saveClientSettings(normalizeClientSettings(form));
    const result = await probeConnection();
    setProbe(result);
    setProbing(false);
  }

  async function handleApplyJudgeRuntime() {
    setApplyingJudgeRuntime(true);
    setLlmApplyMessage("");
    const validation = validateClientSettings(form);
    if (!validation.ok) {
      setError(validation.message ?? "Fix validation errors before saving the server key.");
      setApplyingJudgeRuntime(false);
      return;
    }
    if (!form.llmApiKey.trim()) {
      setError("Enter your Qwen API key first.");
      setApplyingJudgeRuntime(false);
      return;
    }
    const normalized = normalizeClientSettings(form);
    saveClientSettings({...normalized, llmApiKey: ""});
    setForm({...normalized, llmApiKey: ""});
    const result = await applyJudgeRuntimeConfig({
      llmBaseUrl: normalized.llmBaseUrl,
      llmModel: normalized.llmModel,
      llmApiKey: normalized.llmApiKey,
    });
    setLlmApplyMessage(result.message);
    if (result.ok) {
      setForm(f => ({...f, llmApiKey: ""}));
      setServerRuntime(await fetchJudgeRuntimeStatus());
      setProbing(true);
      const probeResult = await probeConnection();
      setProbe(probeResult);
      setProbing(false);
    } else {
      setError(result.message);
    }
    setApplyingJudgeRuntime(false);
  }

  async function handleApplyLlm() {
    setApplyingLlm(true);
    setLlmApplyMessage("");
    const validation = validateClientSettings(form);
    if (!validation.ok) {
      setError(validation.message ?? "Fix validation errors before applying LLM settings.");
      setApplyingLlm(false);
      return;
    }
    const normalized = normalizeClientSettings(form);
    saveClientSettings({...normalized, llmApiKey: ""});
    setForm({...normalized, llmApiKey: ""});
    const result = await applyDevLlmConnection(normalized);
    setLlmApplyMessage(result.message);
    if (result.ok) {
      setProbing(true);
      const probeResult = await probeConnection();
      setProbe(probeResult);
      setProbing(false);
    }
    setApplyingLlm(false);
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <WorkspaceAlerts />

      <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>Connection</p>
        <h2 className={wsPanelTitle}>Workspace API settings</h2>
        <p className={`${wsLead} max-w-none`}>
          Set how this browser reaches the Change Society API and which project scope headers are sent. Database settings
          still live in server <code className="text-xs">hackathon/.env</code>; LLM fields are in the section below.
        </p>

        {savedPendingReload && (
          <div className={`${wsAlertWarn} mt-4`} role="status">
            Settings saved in this browser. <strong className="font-medium text-amber-100">Reload the page</strong> (or
            restart this tab) so scenarios and runs load with the new connection. No backend service restart is required
            for these fields.
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className={`${wsGridSingle} mt-5 grid w-full gap-4 sm:grid-cols-2`}>
          <label className={`${wsFieldLabel} sm:col-span-2`} htmlFor="settings-api-mode">
            API access
            <WorkspaceSelect
              id="settings-api-mode"
              value={form.apiMode}
              onValueChange={v => update("apiMode", v === "direct" ? "direct" : "proxy")}
              options={[
                {value: "proxy", label: "Same-origin proxy (recommended on LAN)"},
                {value: "direct", label: "Direct API URL from browser"},
              ]}
              aria-label="API access mode"
            />
          </label>

          {form.apiMode === "direct" && (
            <label className={`${wsFieldLabel} sm:col-span-2`} htmlFor="settings-api-url">
              API base URL
              <input
                id="settings-api-url"
                className={wsFieldControl}
                value={form.apiBaseUrl}
                onChange={e => update("apiBaseUrl", e.target.value)}
                placeholder="http://192.168.1.150:32500"
                spellCheck={false}
              />
            </label>
          )}

          <label className={wsFieldLabel} htmlFor="settings-project">
            Project ID
            <input
              id="settings-project"
              className={wsFieldControl}
              value={form.projectId}
              onChange={e => update("projectId", e.target.value)}
              spellCheck={false}
            />
          </label>

          <label className={wsFieldLabel} htmlFor="settings-tenant">
            Tenant ID
            <input
              id="settings-tenant"
              className={wsFieldControl}
              value={form.tenantId}
              onChange={e => update("tenantId", e.target.value)}
              spellCheck={false}
            />
          </label>

          <label className={wsFieldLabel} htmlFor="settings-workspace">
            Workspace ID
            <input
              id="settings-workspace"
              className={wsFieldControl}
              value={form.workspaceId}
              onChange={e => update("workspaceId", e.target.value)}
              spellCheck={false}
            />
          </label>

          <label className={wsFieldLabel} htmlFor="settings-actor">
            Actor ID
            <input
              id="settings-actor"
              className={wsFieldControl}
              value={form.actorId}
              onChange={e => update("actorId", e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button type="button" onClick={handleSave}>
            Save settings
          </Button>
          <Button type="button" variant="outline" disabled={probing} onClick={() => void handleTestConnection()}>
            {probing ? "Testing…" : "Test connection"}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset to defaults
          </Button>
          {savedPendingReload && (
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              Reload workspace now
            </Button>
          )}
        </div>
      </article>

      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>Status</p>
        <h3 className={wsPanelTitle}>Effective connection</h3>
        <dl className="mt-3 space-y-3 text-sm">
          {probing && !probe && (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Testing connection to the API…
            </div>
          )}
          {probe && (
            <div className={probe.ok ? "rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-3 py-2" : wsAlertWarn}>
              <dt className="font-medium">{probe.ok ? "Connection OK" : "Connection failed"}</dt>
              <dd className="mt-1 text-xs leading-relaxed">
                {probe.ok && (
                  <>
                    Ready status: {probe.readyStatus ?? "—"} · scenarios: {probe.scenarioCount ?? 0}. Reload the workspace
                    if the run list was empty before.
                  </>
                )}
                {!probe.ok && probe.error}
              </dd>
            </div>
          )}
          {probe && (
            <div>
              <dt className="text-muted-foreground">LLM runtime (API)</dt>
              <dd className="mt-1 font-mono text-[11px] text-foreground">
                {probe.modelProvider ?? "—"}
                {probe.modelName ? ` · ${probe.modelName}` : ""}
                {probe.modelConfigured === false ? " · not configured" : ""}
              </dd>
              {probe.modelBaseUrl && (
                <dd className={`${wsMeta} mt-1 font-mono text-[10px] text-muted-foreground`}>{probe.modelBaseUrl}</dd>
              )}
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Resolved API base</dt>
            <dd className={`${wsMeta} font-mono text-[11px] text-foreground`}>{effectiveApi}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Backend runtime</dt>
            <dd className="mt-1 text-foreground">{ws.runtimeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Session</dt>
            <dd className="mt-1 capitalize text-foreground">{ws.viewState.replaceAll("_", " ")}</dd>
          </div>
        </dl>
        <p className={`${wsMeta} mt-4 max-w-none`}>
          Proxy mode forwards through this Next.js app to port 32500 on the host running the UI. For a permanent LLM
          config, paste the snippet below into <code className="text-xs">hackathon/.env</code> and restart the API.
        </p>
      </article>
      </div>

      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>Developer</p>
        <h2 className={wsPanelTitle}>Debug logging</h2>
        <p className={`${wsLead} max-w-none`}>
          When enabled, the browser console shows tagged traces for API calls, workspace bootstrap, run lifecycle, and SSR
          fetches. Errors are always logged. Save settings, then open DevTools → Console (filter by{" "}
          <code className="text-xs">ChangeSociety</code>).
        </p>
        <label className={`${wsFieldLabel} mt-5 flex cursor-pointer items-center gap-3`}>
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={form.debugLogging}
            onChange={e => update("debugLogging", e.target.checked)}
          />
          <span>Enable verbose client logging</span>
        </label>
        <p className={`${wsMeta} mt-3 max-w-none`}>
          Default on in development. Override with env{" "}
          <code className="text-xs">NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG=true|false</code>.
        </p>
      </article>

      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>LLM</p>
        <h2 className={wsPanelTitle}>LLM API settings</h2>
        <p className={`${wsLead} max-w-none`}>
          Enter your Qwen API key <strong className="font-medium text-foreground">only when submitting</strong> — it is{" "}
          <strong className="font-medium text-foreground">never saved in the browser</strong> (not in localStorage). Use{" "}
          <strong className="font-medium text-foreground">Save key &amp; restart worker</strong> to store the key on the
          server in <strong className="font-medium text-foreground">PostgreSQL</strong> and sync{" "}
          <code className="text-xs">.env</code> for the LangGraph worker, then restart it. Base URL and model can still be
          saved in this browser via <strong className="font-medium text-foreground">Save settings</strong>.
        </p>

        {serverRuntime?.qwen_api_key_configured && (
          <p className={`${wsMeta} mt-3 max-w-none text-emerald-200/90`} role="status">
            Server reports a Qwen API key is configured (value is not shown).
          </p>
        )}

        {!inProcessQwen && (
          <p className={`${wsMeta} mt-3 max-w-none rounded-lg border border-border/70 bg-muted/20 px-3 py-2`}>
            Default demo stack uses <code className="text-xs">MODEL_PROVIDER=fake</code> + LangGraph worker — ignore{" "}
            <strong className="font-medium text-foreground">Apply to running API</strong> (that button is for in-process
            Qwen only). Use <strong className="font-medium text-foreground">Save key &amp; restart worker</strong> instead.
          </p>
        )}

        {llmApplyMessage && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
              llmApplyMessage.toLowerCase().includes("updated") ||
              llmApplyMessage.toLowerCase().includes("applied") ||
              llmApplyMessage.toLowerCase().includes("restarted") ||
              llmApplyMessage.toLowerCase().includes("saved") ||
              llmApplyMessage.toLowerCase().includes("postgresql")
                ? "border-emerald-600/40 bg-emerald-950/30"
                : wsAlertWarn
            }`}
            role="status"
          >
            {llmApplyMessage}
          </div>
        )}

        <div className={`${wsGridSingle} mt-5 grid w-full gap-4 sm:grid-cols-2`}>
          <label className={`${wsFieldLabel} sm:col-span-2`} htmlFor="settings-llm-base">
            LLM base URL
            <input
              id="settings-llm-base"
              className={wsFieldControl}
              value={form.llmBaseUrl}
              onChange={e => update("llmBaseUrl", e.target.value)}
              placeholder="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className={wsFieldLabel} htmlFor="settings-llm-model">
            Model
            <input
              id="settings-llm-model"
              className={wsFieldControl}
              value={form.llmModel}
              onChange={e => update("llmModel", e.target.value)}
              placeholder="qwen-plus"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className={wsFieldLabel} htmlFor="settings-llm-key">
            API key (not stored in browser)
            <input
              id="settings-llm-key"
              type="password"
              className={wsFieldControl}
              value={form.llmApiKey}
              onChange={e => update("llmApiKey", e.target.value)}
              placeholder="Paste key, then Save key & restart worker"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button type="button" disabled={applyingJudgeRuntime} onClick={() => void handleApplyJudgeRuntime()}>
            {applyingJudgeRuntime ? "Restarting worker…" : "Save key & restart worker"}
          </Button>
          {inProcessQwen ? (
            <Button type="button" variant="outline" disabled={applyingLlm} onClick={() => void handleApplyLlm()}>
              {applyingLlm ? "Applying…" : "Apply to running API (dev)"}
            </Button>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground">hackathon/.env snippet (restart API after paste)</p>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border/80 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {envSnippet}
          </pre>
        </div>
      </article>
    </div>
  );
}
