"use client";

import type {AgentMessage, Conflict, SocietyRun} from "../lib/api";
import {roleDisplayName, humanRunStateLabel} from "../lib/demo-state";
import {panelClass, wsMeta, wsStep} from "@/lib/workspace-ui";

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
  return String(payload.summary ?? payload.rationale ?? payload.verdict ?? "No short summary available");
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

  const cell = "rounded-lg border border-border bg-background p-3 text-sm";

  return (
    <section className={`${panelClass()} mt-4`} aria-labelledby="negotiation-title">
      <div className={wsStep}>Disagreement summary</div>
      <h3 id="negotiation-title" className="text-base font-semibold text-foreground">
        How specialists argued — in plain language
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        For judges: read this before the Approve / Reject buttons. Agent Story has the full timeline.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className={cell}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Where each specialist started</h4>
          <ul className="mt-2 space-y-3">
            <li>
              <strong className="text-foreground">{roleDisplayName("change_analyst")}</strong>
              <span className="ml-2 text-[10px] text-amber-500">{change?.risk_level ?? "—"} risk</span>
              <p className="mt-1 text-muted-foreground">{summaryLine(change)}</p>
            </li>
            <li>
              <strong className="text-foreground">{roleDisplayName("impact_analyst")}</strong>
              <span className="ml-2 text-[10px] text-amber-500">{impact?.risk_level ?? "—"} risk</span>
              <p className="mt-1 text-muted-foreground">{summaryLine(impact)}</p>
            </li>
            <li>
              <strong className="text-foreground">{roleDisplayName("policy_guardian")}</strong>
              <span className="ml-2 text-[10px] text-amber-500">{policy?.risk_level ?? "—"} risk</span>
              <p className="mt-1 text-muted-foreground">{summaryLine(policy)}</p>
            </li>
          </ul>
        </article>

        <article className={cell}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recorded disagreement</h4>
          {conflict ? (
            <>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <strong>{conflict.claim_a_risk}</strong>
                <em className="text-muted-foreground not-italic">vs</em>
                <strong>{conflict.claim_b_risk}</strong>
              </p>
              <p className="mt-2 text-muted-foreground">{conflict.rationale}</p>
              <small className={wsMeta}>
                {conflict.status} · {conflict.rebuttal_message_ids.length} rebuttal(s)
              </small>
            </>
          ) : (
            <p className={`${wsMeta} mt-2`}>No disagreement recorded on this run.</p>
          )}
        </article>

        <article className={cell}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Follow-up replies (one round)</h4>
          {[...changeRebuttals, ...policyRebuttals].length === 0 ? (
            <p className={`${wsMeta} mt-2`}>No follow-up replies yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {[...changeRebuttals, ...policyRebuttals].map(message => (
                <li key={message.message_id}>
                  <strong className="text-foreground">{roleDisplayName(message.sender_role)}</strong>
                  <p className="text-muted-foreground">{summaryLine(message)}</p>
                  <small className={wsMeta}>Evidence: {message.evidence_refs.join(", ") || "none"}</small>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={cell}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coordinator recommendation</h4>
          {decision ? (
            <>
              <p className="mt-2 text-muted-foreground">{summaryLine(decision)}</p>
              <small className={wsMeta}>Outcome label: {String(decision.payload.verdict ?? "—")}</small>
            </>
          ) : (
            <p className={`${wsMeta} mt-2`}>No coordinator recommendation yet — or none was required.</p>
          )}
        </article>

        <article className={cell}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Who must approve</h4>
          {approvers && approvers.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {approvers.map(item => (
                <li key={item} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${wsMeta} mt-2`}>Listed when policy or the coordinator requires named approvers.</p>
          )}
          <p className={wsMeta}>Approval gate: {humanRunStateLabel(props.run.state)}</p>
        </article>
      </div>
    </section>
  );
}
