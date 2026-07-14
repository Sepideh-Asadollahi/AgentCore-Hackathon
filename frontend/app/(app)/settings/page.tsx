"use client";

import {useEffect, useMemo, useState} from "react";
import {Button} from "@/components/animate-ui/components/buttons/button";
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
  const fixedConnection = useMemo(() => buildDefaultClientSettings(), []);
  const [form, setForm] = useState<ClientSettings>(() =>
    typeof window !== "undefined" ? loadClientSettings() : buildDefaultClientSettings(),
  );
  const [error, setError] = useState("");
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [probe, setProbe] = useState<ConnectionProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [llmApplyMessage, setLlmApplyMessage] = useState("");
  const [applyingLlm, setApplyingLlm] = useState(false);
  const [applyingJudgeRuntime, setApplyingJudgeRuntime] = useState(false);
  const [serverRuntime, setServerRuntime] = useState<JudgeRuntimeStatus | null>(null);

  const envSnippet = useMemo(() => buildHackathonEnvSnippet(form), [form]);
  const inProcessQwen =
    probe?.modelProvider === "qwen_cloud" || probe?.modelProvider === "qwen" || serverRuntime?.model_provider === "qwen";
  const effectiveApi = useMemo(() => effectiveApiBasePreview(fixedConnection), [fixedConnection]);

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

  function update<K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) {
    setForm(prev => {
      const next = normalizeClientSettings({...prev, [key]: value});
      if (key === "debugLogging") configureAppLogging(next);
      return next;
    });
    setPrefsSaved(false);
    setError("");
  }

  function handleSavePreferences() {
    const validation = validateClientSettings(form);
    if (!validation.ok) {
      setError(validation.message ?? "Invalid settings.");
      return;
    }
    const normalized = normalizeClientSettings(form);
    saveClientSettings(normalized);
    setForm({...normalized, llmApiKey: ""});
    configureAppLogging(normalized);
    setPrefsSaved(true);
    setError("");
  }

  function handleResetPreferences() {
    clearClientSettings();
    const defaults = buildDefaultClientSettings();
    setForm(defaults);
    configureAppLogging(defaults);
    setPrefsSaved(true);
    setError("");
    setProbe(null);
  }

  async function handleTestConnection() {
    setProbing(true);
    setProbe(null);
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
          <h2 className={wsPanelTitle}>API connection (fixed)</h2>
          <p className={`${wsLead} max-w-none`}>
            This demo always uses same-origin <strong className="font-medium text-foreground">proxy</strong> access and
            built-in demo scope IDs. Operators do not configure these in the browser — adjust server env only if you
            deploy a custom build.
          </p>

          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Resolved API base</dt>
              <dd className={`${wsMeta} font-mono text-[11px] text-foreground`}>{effectiveApi}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Project / tenant / workspace</dt>
              <dd className={`${wsMeta} font-mono text-[11px] text-foreground`}>
                {fixedConnection.projectId} · {fixedConnection.tenantId} · {fixedConnection.workspaceId}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actor</dt>
              <dd className={`${wsMeta} font-mono text-[11px] text-foreground`}>{fixedConnection.actorId}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button type="button" variant="outline" disabled={probing} onClick={() => void handleTestConnection()}>
              {probing ? "Testing…" : "Test connection"}
            </Button>
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
                      Ready status: {probe.readyStatus ?? "—"} · scenarios: {probe.scenarioCount ?? 0}.
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
              <dt className="text-muted-foreground">Backend runtime</dt>
              <dd className="mt-1 text-foreground">{ws.runtimeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Session</dt>
              <dd className="mt-1 capitalize text-foreground">{ws.viewState.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>Developer</p>
        <h2 className={wsPanelTitle}>Debug logging</h2>
        <p className={`${wsLead} max-w-none`}>
          When enabled, the browser console shows tagged traces for API calls, workspace bootstrap, run lifecycle, and SSR
          fetches. Errors are always logged. Save preferences, then open DevTools → Console (filter by{" "}
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
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button type="button" variant="outline" onClick={handleSavePreferences}>
            Save preferences
          </Button>
          <Button type="button" variant="outline" onClick={handleResetPreferences}>
            Reset preferences
          </Button>
          {prefsSaved && (
            <span className="self-center text-xs text-emerald-200/90" role="status">
              Saved in this browser (debug + LLM URL/model only).
            </span>
          )}
        </div>
      </article>

      <article className={panelClass("w-full min-w-0")}>
        <p className={wsStep}>LLM</p>
        <h2 className={wsPanelTitle}>LLM API settings</h2>
        <p className={`${wsLead} max-w-none`}>
          Enter your Qwen API key <strong className="font-medium text-foreground">only when submitting</strong> — it is{" "}
          <strong className="font-medium text-foreground">never saved in the browser</strong>. Use{" "}
          <strong className="font-medium text-foreground">Save key &amp; restart worker</strong> to store the key on the
          server in <strong className="font-medium text-foreground">PostgreSQL</strong> and sync{" "}
          <code className="text-xs">.env</code> for the LangGraph worker. Base URL and model can be saved with{" "}
          <strong className="font-medium text-foreground">Save preferences</strong> above.
        </p>

        {serverRuntime?.qwen_api_key_configured && (
          <p className={`${wsMeta} mt-3 max-w-none text-emerald-200/90`} role="status">
            Server reports a Qwen API key is configured (value is not shown).
          </p>
        )}

        {!inProcessQwen && (
          <p className={`${wsMeta} mt-3 max-w-none rounded-lg border border-border/70 bg-muted/20 px-3 py-2`}>
            Default demo stack uses <code className="text-xs">MODEL_PROVIDER=fake</code> + LangGraph worker — use{" "}
            <strong className="font-medium text-foreground">Save key &amp; restart worker</strong> for live Qwen on the
            worker.
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
