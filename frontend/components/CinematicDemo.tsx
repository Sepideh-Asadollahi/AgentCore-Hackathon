"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import type {AgentMessage, AgentTicket, Conflict, FrontendDelivery, ManagedAgent, Scenario, SocietyRun} from "../lib/api";
import {CINEMATIC_BEATS} from "../lib/cinematic-beats";
import {domainLabel, scenarioBeatCaption, scenarioBeatNarration} from "../lib/scenario-cinematic";
import {roleDisplayName} from "../lib/demo-state";
import {useCinematicPlayback} from "../lib/use-cinematic-playback";
import {usePrefersReducedMotion} from "../lib/use-prefers-reduced-motion";
import {NegotiationPanel} from "./NegotiationPanel";
import {AblationComparisonTable} from "./AblationComparisonTable";

type Props = {
  scenarios: Scenario[];
  scenario: Scenario | null;
  scenarioId: string;
  onScenarioIdChange: (id: string) => void;
  requestText: string;
  onRequestTextChange: (text: string) => void;
  scenarioTitle: string;
  requestPreview: string;
  runtimeLabel: string;
  apiDegraded: boolean;
  autoPlay: boolean;
  onAutoPlayChange: (value: boolean) => void;
  run: SocietyRun | null;
  agents: ManagedAgent[];
  tickets: AgentTicket[];
  messages: AgentMessage[];
  conflicts: Conflict[];
  busy: boolean;
  evaluation: Record<string, unknown> | null;
  frontendDelivery: FrontendDelivery | null;
  onExit: () => void;
  onStartRun: () => void;
  onNewRun: () => void;
  onApprove: () => void;
  onEvaluate: () => void;
};

const ROLE_ORDER = [
  "context_scout",
  "change_analyst",
  "impact_analyst",
  "policy_guardian",
  "coordinator",
  "frontend_delivery_lead",
];

function ticketsForBeat(beatIndex: number, tickets: AgentTicket[]): AgentTicket[] {
  if (beatIndex < 2) return [];
  const cap = beatIndex === 2 ? 3 : beatIndex === 3 ? 5 : tickets.length;
  return tickets.slice(0, cap);
}

function messagesForBeat(beatIndex: number, messages: AgentMessage[]): AgentMessage[] {
  if (beatIndex < 3) return [];
  if (beatIndex === 3) return messages.slice(0, Math.min(4, messages.length));
  return messages;
}

export function CinematicDemo(props: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [revealedMessages, setRevealedMessages] = useState(0);

  const playback = useCinematicPlayback({
    reducedMotion,
    autoPlay: props.autoPlay,
    busy: props.busy,
    hasRun: !!props.run,
    runEpoch: props.run?.run_id ?? "",
    ticketCount: props.tickets.length,
    messageCount: props.messages.length,
    conflictCount: props.conflicts.length,
    awaitingApproval: props.run?.state === "awaiting_approval",
    completed: props.run?.state === "completed",
    hasFrontendHandoff: !!props.frontendDelivery?.frontend_work_required,
  });

  const beat = playback.beat;
  const progress = ((beat.index + 1) / CINEMATIC_BEATS.length) * 100;

  const narration = scenarioBeatNarration(props.scenario, beat.id) ?? beat.narration;
  const caption =
    beat.id === "request" || beat.id === "intro" ? scenarioBeatCaption(props.scenario) : beat.caption;

  const visibleTickets = useMemo(
    () => (props.busy ? [] : ticketsForBeat(beat.index, props.tickets)),
    [beat.index, props.busy, props.tickets],
  );

  const stagedMessages = useMemo(
    () => messagesForBeat(beat.index, props.messages),
    [beat.index, props.messages],
  );

  const visibleMessages = useMemo(
    () => stagedMessages.slice(0, reducedMotion ? stagedMessages.length : revealedMessages),
    [stagedMessages, revealedMessages, reducedMotion],
  );

  const activeRole = useMemo(() => {
    const last = visibleMessages[visibleMessages.length - 1];
    if (last) return last.sender_role;
    const roleByBeat: Record<number, string> = {
      2: "context_scout",
      3: "change_analyst",
      4: "policy_guardian",
      5: "coordinator",
      6: "frontend_delivery_lead",
    };
    return roleByBeat[beat.index] ?? null;
  }, [visibleMessages, beat.index]);

  useEffect(() => {
    if (reducedMotion) {
      setRevealedMessages(props.messages.length);
      return;
    }
    setRevealedMessages(0);
    let cursor = 0;
    const target = messagesForBeat(beat.index, props.messages).length;
    const interval = window.setInterval(() => {
      cursor += 1;
      setRevealedMessages(cursor);
      if (cursor >= target) window.clearInterval(interval);
    }, 420);
    return () => window.clearInterval(interval);
  }, [props.messages, beat.index, reducedMotion]);

  const [typingDone, setTypingDone] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) {
      setTypingDone(true);
      return;
    }
    setTypingDone(false);
    const timer = window.setTimeout(() => setTypingDone(true), Math.min(2400, narration.length * 18));
    return () => window.clearTimeout(timer);
  }, [beat.id, narration, reducedMotion]);

  const advanceBeat = playback.advanceBeat;
  const retreatBeat = playback.retreatBeat;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onExit();
      if (event.key === "ArrowRight") advanceBeat();
      if (event.key === "ArrowLeft") retreatBeat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advanceBeat, retreatBeat, props.onExit]);

  const conflict = props.conflicts[0];
  const showConflict = beat.index >= 4;
  const showApproval = props.run?.state === "awaiting_approval" && beat.index >= 5;
  const showFrontend = props.frontendDelivery?.frontend_work_required && beat.index >= 6;
  const showOutcome = props.run && beat.id === "outcome";

  const onScenarioSelect = useCallback(
    (id: string) => {
      props.onScenarioIdChange(id);
      playback.resetPlayback();
    },
    [props, playback],
  );

  return (
    <section className="cinematic-shell" aria-labelledby="cinematic-title">
      <div className="cinematic-backdrop" aria-hidden="true"/>
      <header className="cinematic-header">
        <div>
          <span className="eyebrow">CINEMATIC DEMO · AGENT SOCIETY</span>
          <h2 id="cinematic-title">How the control plane orchestrates specialists</h2>
          <p className="cinematic-runtime-badge">
            Live backend · <strong>{props.runtimeLabel}</strong>
          </p>
        </div>
        <div className="cinematic-controls">
          <label className="cinematic-autoplay">
            <input
              type="checkbox"
              checked={props.autoPlay}
              onChange={e => props.onAutoPlayChange(e.target.checked)}
            />
            Auto-play all stages
          </label>
          <button type="button" className="secondary" onClick={props.onExit}>Exit to inspector</button>
          <button type="button" className="secondary" onClick={advanceBeat} aria-label="Skip to next cinematic beat">
            Skip beat
          </button>
        </div>
      </header>

      {!props.run && (
        <div className="cinematic-launch panel cinematic-in">
          <div className="step">Run live society test from the UI</div>
          <label>
            Domain scenario
            <select value={props.scenarioId} disabled={props.busy} onChange={e => onScenarioSelect(e.target.value)}>
              {props.scenarios.map(item => (
                <option key={item.scenario_id} value={item.scenario_id}>
                  {item.title} ({domainLabel(item.domain)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Change request (sent to live API)
            <textarea
              value={props.requestText}
              disabled={props.busy}
              rows={4}
              onChange={e => props.onRequestTextChange(e.target.value)}
            />
          </label>
          {props.scenario && (
            <>
              <p className="cinematic-domain">
                {domainLabel(props.scenario.domain)} · {props.scenario.feature_demonstrations.length} features ·{" "}
                {props.scenario.governance_rules.length} governance rules
              </p>
              <ul className="cinematic-rule-chips">
                {props.scenario.governance_rules.map(rule => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <ul className="cinematic-feature-chips">
                {props.scenario.feature_demonstrations.map(item => (
                  <li key={item}>{item.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            className="cinematic-primary cinematic-run-live"
            onClick={props.onStartRun}
            disabled={props.busy || props.apiDegraded || props.requestText.trim().length < 10}
          >
            {props.busy ? "Live run in progress…" : "Run live test"}
          </button>
          {props.apiDegraded && (
            <p className="meta warn-text">API unreachable — start change-society-service on port 32500.</p>
          )}
        </div>
      )}

      <div className="cinematic-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="cinematic-progress-fill" style={{width: `${progress}%`}}/>
        <ol className="cinematic-rail">
          {CINEMATIC_BEATS.map(item => (
            <li
              key={item.id}
              className={`${item.index <= beat.index ? "active" : ""} ${item.index === beat.index ? "current" : ""}`}
            >
              <button
                type="button"
                className="cinematic-rail-btn"
                disabled={!props.run && item.index > 0}
                onClick={() => playback.setManualBeat(item.id)}
                aria-current={item.index === beat.index ? "step" : undefined}
              >
                <span>{item.index + 1}</span>
                <small>{item.title.split(" ").slice(0, 2).join(" ")}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {props.busy && (
        <div className="live-run-pipeline cinematic-in" aria-live="polite">
          <p className="live-run-label">Live test executing on server — animating orchestration stages</p>
          <ol className="live-run-steps">
            {CINEMATIC_BEATS.filter(b => b.id !== "intro" && b.id !== "outcome").map(step => (
              <li key={step.id} className={step.id === beat.id ? "active" : step.index < beat.index ? "done" : ""}>
                <span className="live-run-dot"/>
                {step.title}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="cinematic-stage" aria-live="polite" aria-atomic="true">
        <p className="cinematic-caption">{caption}</p>
        <h3 className={`cinematic-narration ${typingDone ? "done" : "typing"}`}>{narration}</h3>
        <p className="cinematic-scenario">
          <strong>{props.scenarioTitle}</strong>
          <span>{props.requestPreview}</span>
        </p>

        <div className="agent-constellation">
          {ROLE_ORDER.map((role, index) => {
            const agent = props.agents[index];
            const lit =
              activeRole === role ||
              (beat.id === "routing" && index <= Math.min(props.tickets.length, ROLE_ORDER.length - 1)) ||
              (props.busy && beat.id === "routing" && index <= 2);
            return (
              <div
                key={role}
                className={`agent-node ${lit ? "active" : ""}`}
                style={{animationDelay: reducedMotion ? "0ms" : `${index * 120}ms`}}
              >
                <span className="agent-halo"/>
                <strong>{roleDisplayName(role)}</strong>
                <small>{agent?.state ?? "registered"}</small>
              </div>
            );
          })}
        </div>

        {visibleTickets.length > 0 && (
          <div className="ticket-stream">
            {visibleTickets.map((ticket, index) => (
              <article key={ticket.ticket_id} className="ticket-card" style={{animationDelay: `${index * 90}ms`}}>
                <span>{ticket.state}</span>
                <b>{ticket.title}</b>
                <i>{ticket.capability}</i>
              </article>
            ))}
          </div>
        )}

        <div className="message-stream">
          {visibleMessages.slice(-5).map((message, index) => (
            <article
              key={message.message_id}
              className="message-card cinematic-in"
              style={{animationDelay: reducedMotion ? "0ms" : `${index * 100}ms`}}
            >
              <header>
                <span>{roleDisplayName(message.sender_role)}</span>
                <mark>{message.message_type}</mark>
              </header>
              <p>
                {String(
                  message.payload.summary ??
                    message.payload.rationale ??
                    message.payload.verdict ??
                    "Evidence-bound structured payload",
                )}
              </p>
              <footer>{message.evidence_refs.length} evidence refs · {message.risk_level} risk</footer>
            </article>
          ))}
        </div>

        {showConflict && (
          <div className="conflict-beat cinematic-in">
            <span>Conflict detected</span>
            {conflict ? (
              <>
                <strong>{conflict.claim_a_risk}</strong>
                <em>vs</em>
                <strong>{conflict.claim_b_risk}</strong>
                <p>{conflict.rationale}</p>
              </>
            ) : (
              <p>Specialists exchange bounded rebuttals when risk or policy claims diverge.</p>
            )}
          </div>
        )}

        {props.run && beat.index >= 3 && (
          <NegotiationPanel run={props.run} messages={props.messages} conflicts={props.conflicts} />
        )}

        {showApproval && (
          <div className="approval-gate cinematic-in">
            <p>Run paused — human approval required before tasks ship.</p>
            <button type="button" onClick={props.onApprove} disabled={props.busy}>
              {props.busy ? "Recording decision…" : "Approve guarded plan (live)"}
            </button>
          </div>
        )}

        {showFrontend && (
          <div className="frontend-handoff-beat cinematic-in">
            <p>
              <strong>Frontend team queue</strong> — ticket{" "}
              {props.frontendDelivery?.tickets[0]?.ticket_id ?? "pending"} (
              {props.frontendDelivery?.tickets[0]?.capability ?? "coordinate_frontend_ui_delivery"})
            </p>
            <ul>
              {(props.frontendDelivery?.handoff_message?.payload.ui_changes as string[] | undefined)?.slice(0, 3).map(item => (
                <li key={item}>{item}</li>
              ))}
              {(props.frontendDelivery?.handoff_message?.payload.ux_review_items as string[] | undefined)?.slice(0, 2).map(item => (
                <li key={item}>UX: {item}</li>
              ))}
              {(props.frontendDelivery?.handoff_message?.payload.api_client_updates as string[] | undefined)?.slice(0, 2).map(item => (
                <li key={item}>API client: {item}</li>
              ))}
            </ul>
          </div>
        )}

        {showOutcome && (
          <div className="outcome-beat cinematic-in">
            <div className="metrics cinematic-metrics">
              <div><strong>{Math.round(Number(props.run?.metrics.critical_impact_recall ?? 0) * 100)}%</strong><span>Impact recall</span></div>
              <div><strong>{Math.round(Number(props.run?.metrics.policy_match_recall ?? 0) * 100)}%</strong><span>Policy recall</span></div>
              <div><strong>{props.run?.message_count ?? 0}</strong><span>Protocol messages</span></div>
            </div>
            {!props.evaluation && (
              <button type="button" className="secondary" onClick={props.onEvaluate} disabled={props.busy}>
                Compare with single agent
              </button>
            )}
            {props.evaluation && (
              <>
                <AblationComparisonTable evaluation={props.evaluation} />
                <details className="ablation-raw">
                  <summary>Raw evaluation JSON</summary>
                  <pre className="cinematic-pre">{JSON.stringify(props.evaluation, null, 2)}</pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>

      <footer className="cinematic-footer">
        {props.run ? (
          <div className="cinematic-footer-nav">
            <button type="button" className="cinematic-primary" onClick={props.onStartRun} disabled={props.busy}>
              {props.busy ? "Running…" : "Run again (live)"}
            </button>
            <button type="button" className="secondary" onClick={props.onNewRun} disabled={props.busy}>
              New scenario
            </button>
            <button type="button" className="secondary" onClick={retreatBeat} disabled={beat.index === 0}>
              Previous beat
            </button>
            <button type="button" className="secondary" onClick={advanceBeat} disabled={beat.index >= CINEMATIC_BEATS.length - 1}>
              Next beat
            </button>
          </div>
        ) : null}
        <p className="meta">Keyboard: ← → change beat · Esc exits cinematic mode · Run issues a real POST to society-runs</p>
      </footer>
    </section>
  );
}
