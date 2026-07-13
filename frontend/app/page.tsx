"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {OrgPolicyIntakePanel} from "../components/OrgPolicyIntakePanel";
import {CinematicDemo} from "../components/CinematicDemo";
import {NegotiationPanel} from "../components/NegotiationPanel";
import {AblationComparisonTable} from "../components/AblationComparisonTable";
import {AgentMessage, AgentTicket, api, Conflict, FrontendDelivery, ManagedAgent, Scenario, SocietyRun} from "../lib/api";
import {mapRunToDemoState, roleDisplayName} from "../lib/demo-state";

const RUN_STORAGE_KEY = "change-society-active-run";
type PresentationMode = "interactive" | "cinematic";

export default function Home() {
  const [presentation, setPresentation] = useState<PresentationMode>("cinematic");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState("pricing-refactor");
  const selected = useMemo(() => scenarios.find(item => item.scenario_id === scenarioId), [scenarios, scenarioId]);
  const [requestText, setRequestText] = useState("");
  const [run, setRun] = useState<SocietyRun | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [agents, setAgents] = useState<ManagedAgent[]>([]);
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [frontendDelivery, setFrontendDelivery] = useState<FrontendDelivery | null>(null);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiReachable, setApiReachable] = useState(true);
  const [correlationId, setCorrelationId] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [runtimeLabel, setRuntimeLabel] = useState("connecting…");

  const viewState = mapRunToDemoState(run, {apiReachable, transportError: error || undefined});

  const refresh = useCallback(async (active: SocietyRun) => {
    const [allMessages, allConflicts, allTickets, allAgents, latest, delivery] = await Promise.all([
      api.messages(active.run_id), api.conflicts(active.run_id), api.tickets(active.run_id), api.agents(), api.getRun(active.run_id),
      api.frontendDelivery(active.run_id).catch(() => null),
    ]);
    setRun(latest);
    setMessages(allMessages);
    setConflicts(allConflicts);
    setTickets(allTickets);
    setAgents(allAgents);
    setFrontendDelivery(delivery);
    sessionStorage.setItem(RUN_STORAGE_KEY, latest.run_id);
  }, []);

  useEffect(() => {
    Promise.all([api.scenarios(), api.agents(), api.readiness().catch(() => null)])
      .then(([items, managed, ready]) => {
        setApiReachable(true);
        setScenarios(items);
        setAgents(managed);
        if (ready?.checks?.model?.provider) {
          const provider = ready.checks.model.provider;
          setRuntimeLabel(provider.includes("qwen") ? "Qwen Cloud (live LLM)" : "Deterministic demo model");
        } else {
          setRuntimeLabel("Backend connected");
        }
        const first = items[0];
        if (first) {
          setScenarioId(first.scenario_id);
          setRequestText(first.default_request);
        }
        const stored = sessionStorage.getItem(RUN_STORAGE_KEY);
        if (stored) {
          return api.getRun(stored).then(async storedRun => {
            setRun(storedRun);
            await refresh(storedRun);
          });
        }
      })
      .catch(err => {
        setApiReachable(false);
        setError(err instanceof Error ? err.message : "API unavailable");
      });
  }, [refresh]);

  useEffect(() => {
    if (selected && !run) setRequestText(selected.default_request);
  }, [selected, run]);

  async function start() {
    setBusy(true);
    setError("");
    setEvaluation(null);
    setCorrelationId("");
    try {
      const created = await api.createRun(scenarioId, requestText);
      setRun(created);
      setCorrelationId(created.correlation_id);
      await refresh(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  async function startFreshRun() {
    sessionStorage.removeItem(RUN_STORAGE_KEY);
    setMessages([]);
    setConflicts([]);
    setTickets([]);
    setEvaluation(null);
    setFrontendDelivery(null);
    setRun(null);
    await start();
  }

  async function decide(action: "approve" | "reject" | "request-changes") {
    if (!run) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.decide(run, action, `${action} after reviewing conflict evidence.`);
      setRun(updated);
      setCorrelationId(updated.correlation_id);
      await refresh(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  async function evaluate() {
    if (!run) return;
    setBusy(true);
    try {
      setEvaluation(await api.evaluate(run.run_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }

  function resetRun() {
    sessionStorage.removeItem(RUN_STORAGE_KEY);
    setRun(null);
    setMessages([]);
    setConflicts([]);
    setTickets([]);
    setFrontendDelivery(null);
    setEvaluation(null);
    setCorrelationId("");
    setError("");
  }

  function onScenarioChange(id: string) {
    const item = scenarios.find(s => s.scenario_id === id);
    setScenarioId(id);
    if (item && !run) setRequestText(item.default_request);
  }

  return (
    <main className={presentation === "cinematic" ? "cinematic-active" : ""}>
      <header>
        <div>
          <span className="eyebrow">QWEN CLOUD · AGENT SOCIETY</span>
          <h1>AgentCore <em>Control Plane</em></h1>
          <p>A vendor-neutral control plane that registers external agents, routes durable tickets, governs negotiation, and preserves evidence.</p>
          <small className="meta">Deployment notes: API {process.env.NEXT_PUBLIC_CHANGE_SOCIETY_API_URL ?? "http://localhost:32500"} · project {process.env.NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID ?? "demo-project"}</small>
          <div className="mode-toggle" role="tablist" aria-label="Presentation mode">
            <button type="button" role="tab" aria-selected={presentation === "cinematic"} className={presentation === "cinematic" ? "active" : ""} onClick={() => setPresentation("cinematic")}>
              Cinematic demo
            </button>
            <button type="button" role="tab" aria-selected={presentation === "interactive"} className={presentation === "interactive" ? "active" : ""} onClick={() => setPresentation("interactive")}>
              Inspector mode
            </button>
          </div>
        </div>
        <div className="status" aria-live="polite">
          <span className={`dot ${viewState === "completed" ? "green" : viewState === "failed" ? "red-dot" : ""}`}/>
          {viewState.replaceAll("_", " ")}
        </div>
      </header>

      {presentation === "cinematic" && !run && (
        <details className="panel org-policy-intake-fold">
          <summary className="step">00 · Org policy intake (optional — strengthens Policy Guardian evidence)</summary>
          <OrgPolicyIntakePanel scenario={selected ?? null} disabled={busy} />
        </details>
      )}

      {presentation === "cinematic" && (
        <CinematicDemo
          scenarios={scenarios}
          scenario={selected ?? null}
          scenarioId={scenarioId}
          onScenarioIdChange={onScenarioChange}
          requestText={requestText}
          onRequestTextChange={setRequestText}
          scenarioTitle={selected?.title ?? "Demo scenario"}
          requestPreview={requestText}
          runtimeLabel={runtimeLabel}
          apiDegraded={viewState === "degraded"}
          autoPlay={autoPlay}
          onAutoPlayChange={setAutoPlay}
          run={run}
          agents={agents}
          tickets={tickets}
          messages={messages}
          conflicts={conflicts}
          busy={busy}
          evaluation={evaluation}
          frontendDelivery={frontendDelivery}
          onExit={() => setPresentation("interactive")}
          onStartRun={() => (run ? startFreshRun() : start())}
          onNewRun={resetRun}
          onApprove={() => decide("approve")}
          onEvaluate={evaluate}
        />
      )}

      {viewState === "degraded" && (
        <div className="banner warn-banner" role="status">
          The API is unreachable or returned a transport error. Check the backend health endpoint and retry after the service is ready.
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
          {correlationId && <div className="meta">Correlation ID: {correlationId}</div>}
        </div>
      )}

      {presentation === "interactive" && (
      <section className="grid org-policy-grid">
        <OrgPolicyIntakePanel scenario={selected ?? null} disabled={busy || !!run} />
      </section>
      )}

      {presentation === "interactive" && (
      <section className="grid">
        <article className="panel input">
          <div className="step">01 · Change request</div>
          <label>
            Demo scenario
            <select value={scenarioId} disabled={busy || !!run} onChange={e => setScenarioId(e.target.value)}>
              {scenarios.map(item => <option key={item.scenario_id} value={item.scenario_id}>{item.title}</option>)}
            </select>
          </label>
          <label>
            Request
            <textarea value={requestText} disabled={busy || !!run} onChange={e => setRequestText(e.target.value)} rows={5}/>
          </label>
          <button onClick={start} disabled={busy || !!run || viewState === "degraded"}>{busy ? "Coordinating…" : "Start controlled run"}</button>
          {run && <button className="secondary" onClick={resetRun}>New run</button>}
        </article>

        <article className="panel timeline">
          <div className="step">02 · Managed agents & durable tickets</div>
          <div className="metrics">{agents.map(agent => <Metric key={agent.agent_id} label={agent.name} value={agent.state}/>)}</div>
          {tickets.length === 0 ? (
            <div className="empty">Capability-routed tickets and lifecycle evidence appear here.</div>
          ) : (
            <div className="messages">
              {tickets.map((ticket, index) => (
                <details key={ticket.ticket_id} open={ticket.capability === "decompose_route_reconcile"}>
                  <summary>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{ticket.title}</b>
                    <i>→ {agents.find(agent => agent.agent_id === ticket.assigned_agent_id)?.name ?? ticket.assigned_agent_id}</i>
                    <mark>{ticket.state}</mark>
                  </summary>
                  <p>{ticket.events.map(event => event.to_state).join(" → ")}</p>
                  <code>{ticket.ticket_id} · {ticket.capability}</code>
                </details>
              ))}
            </div>
          )}
        </article>
      </section>
      )}

      {presentation === "interactive" && (
      <section className="grid lower">
        <article className="panel">
          <div className="step">03 · Universal Agent JSON dialogue & human boundary</div>
          {messages.length === 0 ? (
            <div className="empty">Directed protocol messages appear after the run starts.</div>
          ) : (
            <div className="messages dialogue">
              {messages.map(message => (
                <details key={message.message_id}>
                  <summary>
                    <span>{roleDisplayName(message.sender_role)}</span>
                    <b>{message.message_type}</b>
                    <i>{message.risk_level} risk</i>
                    <mark>{message.recipient_role === message.sender_role ? "broadcast" : roleDisplayName(message.recipient_role)}</mark>
                  </summary>
                  <p>{String(message.payload.summary ?? message.payload.rationale ?? message.payload.verdict ?? "Structured payload")}</p>
                  <code>{message.message_id} · evidence {message.evidence_refs.join(", ") || "none"}</code>
                </details>
              ))}
            </div>
          )}
          {conflicts.length ? conflicts.map(conflict => (
            <div className="conflict" key={conflict.conflict_id}>
              <div><strong>{conflict.claim_a_risk}</strong><span>versus</span><strong>{conflict.claim_b_risk}</strong></div>
              <p>{conflict.rationale}</p>
              <small>{conflict.rebuttal_message_ids.length} evidence-bound rebuttals · {conflict.status}</small>
            </div>
          )) : viewState !== "ready" && <div className="empty">No conflict evaluated yet.</div>}
          <NegotiationPanel run={run} messages={messages} conflicts={conflicts} />
          {run?.state === "awaiting_approval" && (
            <div className="actions">
              <button onClick={() => decide("approve")} disabled={busy}>Approve guarded plan</button>
              <button className="warn" onClick={() => decide("request-changes")} disabled={busy}>Request changes</button>
              <button className="danger" onClick={() => decide("reject")} disabled={busy}>Reject</button>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="step">04 · Measurable result</div>
          {run ? (
            <>
              <div className="metrics">
                <Metric label="Impact recall" value={run.metrics.critical_impact_recall}/>
                <Metric label="Policy recall" value={run.metrics.policy_match_recall}/>
                <Metric label="Protocol messages" value={run.message_count}/>
                <Metric label="Tokens" value={run.metrics.total_tokens}/>
              </div>
              {run.final_result && viewState === "completed" && (
                <details open>
                  <summary>Approved decision, tasks, and memory reference</summary>
                  <pre>{JSON.stringify(run.final_result, null, 2)}</pre>
                </details>
              )}
              {run.excluded_evidence.length > 0 && (
                <details>
                  <summary>Excluded evidence ({run.excluded_evidence.length})</summary>
                  <pre>{JSON.stringify(run.excluded_evidence, null, 2)}</pre>
                </details>
              )}
              <button className="secondary" onClick={evaluate} disabled={busy}>Compare with single agent</button>
              {evaluation && <AblationComparisonTable evaluation={evaluation} />}
              {evaluation && (
                <details>
                  <summary>Raw evaluation JSON</summary>
                  <pre>{JSON.stringify(evaluation, null, 2)}</pre>
                </details>
              )}
            </>
          ) : (
            <div className="empty">Run metrics and baseline comparison appear here.</div>
          )}
        </article>
      </section>
      )}
    </main>
  );
}

function Metric({label, value}: {label: string; value: unknown}) {
  const shown = typeof value === "number" && value <= 1 ? `${Math.round(value * 100)}%` : String(value ?? "—");
  return <div><strong>{shown}</strong><span>{label}</span></div>;
}
