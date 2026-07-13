"use client";

import type {AgentMessage, Conflict, SocietyRun} from "../lib/api";
import {roleDisplayName} from "../lib/demo-state";

type Props = {
  run: SocietyRun | null;
  messages: AgentMessage[];
  conflicts: Conflict[];
};

function finding(messages: AgentMessage[], role: string): AgentMessage | undefined {
  return messages.find(item => item.sender_role === role && item.message_type === "specialist_finding");
}

function rebuttals(messages: AgentMessage[], role: string): AgentMessage[] {
  return messages.filter(item => item.sender_role === role && item.message_type === "rebuttal_response");
}

function coordinatorDecision(messages: AgentMessage[]): AgentMessage | undefined {
  return messages.find(item => item.message_type === "coordinator_decision");
}

function summaryLine(message: AgentMessage | undefined): string {
  if (!message) return "—";
  const payload = message.payload;
  return String(payload.summary ?? payload.rationale ?? payload.verdict ?? "Structured specialist output");
}

export function NegotiationPanel(props: Props) {
  if (!props.run || props.messages.length === 0) return null;

  const change = finding(props.messages, "change_analyst");
  const impact = finding(props.messages, "impact_analyst");
  const policy = finding(props.messages, "policy_guardian");
  const conflict = props.conflicts[0];
  const decision = coordinatorDecision(props.messages);
  const changeRebuttals = rebuttals(props.messages, "change_analyst");
  const policyRebuttals = rebuttals(props.messages, "policy_guardian");

  const approvers = decision
    ? (decision.payload.required_approvers as string[] | undefined)
    : (policy?.payload.required_approvers as string[] | undefined);

  return (
    <section className="negotiation-panel cinematic-in" aria-labelledby="negotiation-title">
      <h3 id="negotiation-title">Negotiation at a glance</h3>
      <p className="negotiation-lead">
        Judges see role disagreement in plain language—not only raw Universal Agent JSON.
      </p>

      <div className="negotiation-grid">
        <article>
          <h4>Initial positions</h4>
          <ul>
            <li>
              <strong>{roleDisplayName("change_analyst")}</strong>
              <span>{change?.risk_level ?? "—"} risk</span>
              <p>{summaryLine(change)}</p>
            </li>
            <li>
              <strong>{roleDisplayName("impact_analyst")}</strong>
              <span>{impact?.risk_level ?? "—"} risk</span>
              <p>{summaryLine(impact)}</p>
            </li>
            <li>
              <strong>{roleDisplayName("policy_guardian")}</strong>
              <span>{policy?.risk_level ?? "—"} risk</span>
              <p>{summaryLine(policy)}</p>
            </li>
          </ul>
        </article>

        <article>
          <h4>Detected conflict</h4>
          {conflict ? (
            <>
              <p className="conflict-claims">
                <strong>{conflict.claim_a_risk}</strong>
                <em>vs</em>
                <strong>{conflict.claim_b_risk}</strong>
              </p>
              <p>{conflict.rationale}</p>
              <small>{conflict.status} · {conflict.rebuttal_message_ids.length} rebuttal(s)</small>
            </>
          ) : (
            <p className="meta">No conflict record on this run.</p>
          )}
        </article>

        <article>
          <h4>Rebuttal (bounded round)</h4>
          {[...changeRebuttals, ...policyRebuttals].length === 0 ? (
            <p className="meta">No rebuttal messages yet.</p>
          ) : (
            <ul>
              {[...changeRebuttals, ...policyRebuttals].map(message => (
                <li key={message.message_id}>
                  <strong>{roleDisplayName(message.sender_role)}</strong>
                  <p>{summaryLine(message)}</p>
                  <small>Evidence: {message.evidence_refs.join(", ") || "none"}</small>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article>
          <h4>Final decision</h4>
          {decision ? (
            <>
              <p>{summaryLine(decision)}</p>
              <small>Verdict: {String(decision.payload.verdict ?? "—")}</small>
            </>
          ) : (
            <p className="meta">Coordinator decision pending or not required.</p>
          )}
        </article>

        <article>
          <h4>Required approvals</h4>
          {approvers && approvers.length > 0 ? (
            <ul className="approval-chips">
              {approvers.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="meta">Derived from policy tags and coordinator output when present.</p>
          )}
          <p className="meta">Human gate: {props.run.state.replaceAll("_", " ")}</p>
        </article>
      </div>
    </section>
  );
}
