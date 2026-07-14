import Link from "next/link";
import type {RunSnapshotServer} from "@/lib/server-change-society";
import {roleDisplayName, humanRunStateLabel} from "@/lib/demo-state";
import {explainRunState} from "@/lib/run-judge-narrative";
import {shouldPersistSocietyRunReport} from "@/lib/run-report-storage";
import type {RunDetailTabId} from "@/lib/run-detail-tabs";
import {runDetailTabHref} from "@/lib/run-detail-tabs";
import {Metric} from "@/components/Metric";
import {JudgeRunGuide, JudgeTicketExplanation} from "@/components/workspace/JudgeRunGuide";
import {JudgeReviewGuide, JudgeResultsGuide, JudgeStoryGuide, JudgeQueueGuide, JudgeMessagesGuide, JudgeDetailsGuide} from "@/components/workspace/JudgePageHints";
import {RunApproveTabClient} from "@/components/workspace/RunApproveTabClient";
import {RunStoryTabClient} from "@/components/workspace/RunStoryTabClient";
import {RunReportsTabClient} from "@/components/workspace/RunReportsTabClient";
import {isDemoAutoApproveReason} from "@/lib/demo-auto-approve";
import {
  panelClass,
  wsBadge,
  wsConflict,
  wsEmpty,
  wsMessageRow,
  wsMessages,
  wsMessageSummary,
  wsMeta,
  wsMetricsGrid,
  wsPre,
  wsStep,
} from "@/lib/workspace-ui";

function agentName(agents: RunSnapshotServer["agents"], agentId: string | null): string {
  if (!agentId) return "—";
  return agents.find(a => a.agent_id === agentId)?.name ?? agentId;
}

type PanelProps = {
  snapshot: RunSnapshotServer;
  autoRefresh: boolean;
  fetchedAt: string;
};

function StatusStrip({snapshot, autoRefresh, fetchedAt}: PanelProps) {
  const {run, messages, tickets, conflicts} = snapshot;
  const stateNarrative = explainRunState(run.state);
  const terminal = shouldPersistSocietyRunReport(run.state);

  return (
    <div
      className="mb-4 rounded-lg border border-amber-600/40 bg-amber-950/25 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-amber-100">
        {autoRefresh
          ? "Run still in progress — this page reloads every 4 seconds so judges can watch without extra setup."
          : stateNarrative.headline}
      </p>
      <p className="mt-1 leading-relaxed text-muted-foreground">{stateNarrative.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {humanRunStateLabel(run.state)} · {messages.length} specialist messages · {tickets.length} tasks ·{" "}
        {conflicts.length} disagreements · last update {fetchedAt}
      </p>
      {terminal && (
        <p className="mt-2 text-xs text-emerald-200/90">
          Stable end state — open{" "}
          <Link href={runDetailTabHref(run.run_id, "reports")} className="underline underline-offset-2">
            Results
          </Link>{" "}
          for rubric scores and comparison to one agent.
        </p>
      )}
    </div>
  );
}

function GuideTab(props: PanelProps) {
  return (
    <>
      <StatusStrip {...props} />
      <JudgeRunGuide snapshot={props.snapshot} />
    </>
  );
}

function QueueTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {run, tickets, agents} = snapshot;
  return (
    <>
      <JudgeQueueGuide />
      <article className={panelClass()}>
        <div className={wsStep}>Tasks</div>
        <p className={`${wsMeta} mb-3 max-w-none`}>
          Expand a row to see what that step did and why it matters for judges. Technical IDs are at the bottom of each
          row.
        </p>
        <p className="mb-3 font-mono text-[11px] text-muted-foreground break-all">{run.run_id}</p>
        {tickets.length === 0 ? (
          <div className={wsEmpty}>No tasks yet — they appear when the coordinator assigns work to agents.</div>
        ) : (
          <div className={wsMessages}>
            {tickets.map((ticket, index) => (
              <details
                key={ticket.ticket_id}
                className={wsMessageRow}
                open={ticket.capability === "decompose_route_reconcile"}
              >
                <summary className={wsMessageSummary}>
                  <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <b>{ticket.title}</b>
                  <i className="text-xs text-muted-foreground not-italic">
                    → {agentName(agents, ticket.assigned_agent_id)}
                  </i>
                  <mark className={wsBadge}>{ticket.state}</mark>
                </summary>
                <JudgeTicketExplanation ticket={ticket} />
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {ticket.events.map(event => event.to_state).join(" → ")}
                </p>
                <code className="text-xs text-muted-foreground">
                  {ticket.ticket_id} · {ticket.capability}
                </code>
              </details>
            ))}
          </div>
        )}
      </article>
      <article className={`${panelClass()} mt-5`}>
        <div className={wsStep}>Registered agents</div>
        <p className={`${wsMeta} mb-4 max-w-none`}>
          Workers available in this demo. The badge shows whether each can accept new tasks.
        </p>
        <div className="flex flex-col gap-4">
          {agents.map(agent => (
            <div key={agent.agent_id} className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                <mark className={wsBadge}>{agent.state}</mark>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{agent.description || agent.adapter_type}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Model provider {agent.provider} · open tasks {agent.active_ticket_count}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground break-all">
                {agent.capabilities.join(", ") || "no capabilities listed"}
              </p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function DialogueTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {messages} = snapshot;
  return (
    <>
      <JudgeMessagesGuide />
      <article className={panelClass()}>
        <div className={wsStep}>Message list</div>
        <p className={`${wsMeta} mb-3 max-w-none`}>
          Bold labels are message types from the protocol. For a guided read, use the Agent Story tab instead.
        </p>
      {messages.length === 0 ? (
        <div className={wsEmpty}>No messages yet — they appear as specialists publish findings.</div>
      ) : (
        <div className={wsMessages}>
          {messages.map(message => (
            <details key={message.message_id} className={wsMessageRow}>
              <summary className={wsMessageSummary}>
                <span className="text-xs text-muted-foreground">{roleDisplayName(message.sender_role)}</span>
                <b>{message.message_type}</b>
                <i className="text-xs text-muted-foreground not-italic">{message.risk_level} risk</i>
                <mark className={wsBadge}>
                  {message.recipient_role === message.sender_role
                    ? "broadcast"
                    : roleDisplayName(message.recipient_role)}
                </mark>
              </summary>
              <p className="text-sm text-muted-foreground">
                {String(
                  message.payload.summary ?? message.payload.rationale ?? message.payload.verdict ?? "No short summary in payload",
                )}
              </p>
              <code className="text-xs text-muted-foreground">
                {message.message_id} · cited evidence {message.evidence_refs.join(", ") || "none"}
              </code>
            </details>
          ))}
        </div>
      )}
    </article>
    </>
  );
}

function StoryTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {run} = snapshot;
  return (
    <>
      <JudgeStoryGuide runId={run.run_id} />
      <RunStoryTabClient />
    </>
  );
}

function ApproveTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {conflicts, run} = snapshot;
  const demoApproved = isDemoAutoApproveReason(run.approval?.reason);

  return (
    <>
      <JudgeReviewGuide runId={run.run_id} />
      <article className={panelClass()}>
        <div className={wsStep}>Review</div>
        <p className={`${wsMeta} mb-3 max-w-none`}>
          Disagreements are listed explicitly — the system does not blend them into one risk score. When status is{" "}
          <span className="text-foreground">Waiting for your approval</span> (now:{" "}
          <span className="text-foreground">{humanRunStateLabel(run.state)}</span>), use the buttons below. Read{" "}
          <Link href={runDetailTabHref(run.run_id, "story")} className="text-primary underline-offset-2 hover:underline">
            Agent Story
          </Link>{" "}
          first for context; open{" "}
          <Link href={runDetailTabHref(run.run_id, "dialogue")} className="text-primary underline-offset-2 hover:underline">
            Messages
          </Link>{" "}
          only if you need the audit list.
        </p>
        {demoApproved && (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/95">
            Demo display mode may auto-approve on the server so judges can see a completed run; the buttons still show how
            a real approver would act.
          </p>
        )}
        {conflicts.length === 0 ? (
          <div className={wsEmpty}>No disagreements recorded for this run yet.</div>
        ) : (
          conflicts.map(conflict => (
            <div className={`${wsConflict} mb-4`} key={conflict.conflict_id}>
              <p className="mb-2 text-sm text-foreground">
                Two specialists reached different risk conclusions, so the run paused until a person decides.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide">
                <strong>{conflict.claim_a_risk}</strong>
                <span className="text-muted-foreground">versus</span>
                <strong>{conflict.claim_b_risk}</strong>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{conflict.rationale}</p>
              <small className="mt-1 block text-xs text-muted-foreground">
                {conflict.rebuttal_message_ids.length} follow-up replies · {conflict.status.replaceAll("_", " ")}
                {conflict.resolution ? ` · outcome ${conflict.resolution.replaceAll("_", " ")}` : ""}
              </small>
            </div>
          ))
        )}
        <RunApproveTabClient />
      </article>
    </>
  );
}

function ReportsTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {run} = snapshot;
  const metrics = run.metrics ?? {};
  const narrative = explainRunState(run.state);
  const demoApproved = isDemoAutoApproveReason(run.approval?.reason);

  return (
    <>
      <JudgeResultsGuide />
      <article className={panelClass()}>
        <div className={wsStep}>Results</div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{narrative.headline}</h2>
        <p className={`${wsMeta} mt-2`}>
          Scenario <span className="font-medium text-foreground">{run.scenario_id}</span> ·{" "}
          <span className="text-foreground">{humanRunStateLabel(run.state)}</span>
        </p>
        {demoApproved && (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/95">
            Demo auto-approve was used — the scores below still come from a real multi-agent run, not mock numbers.
          </p>
        )}
        <p className={`${wsMeta} mt-3 max-w-none`}>
          <strong className="font-medium text-foreground">Critical impact recall</strong> — share of serious impacts the
          scenario expects that the run flagged.{" "}
          <strong className="font-medium text-foreground">Policy match recall</strong> — share of policy checks satisfied.{" "}
          <strong className="font-medium text-foreground">Specialist messages</strong> — count of structured exchanges
          (higher usually means more debate). <strong className="font-medium text-foreground">Total tokens</strong> — rough
          compute cost for this run.
        </p>
        <div className={`${wsMetricsGrid} mt-4`}>
          <Metric label="Critical impact recall" value={metrics.critical_impact_recall as number | undefined} />
          <Metric label="Policy match recall" value={metrics.policy_match_recall as number | undefined} />
          <Metric label="Specialist messages" value={run.message_count} />
          <Metric label="Total tokens" value={metrics.total_tokens as number | undefined} />
        </div>
        {run.final_result && (
          <details className="mt-4" open={run.state === "completed"}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">Final decision (JSON)</summary>
            <pre className={`${wsPre} mt-2`}>{JSON.stringify(run.final_result, null, 2)}</pre>
          </details>
        )}
        {run.excluded_evidence.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Evidence left out of the decision ({run.excluded_evidence.length})
            </summary>
            <pre className={`${wsPre} mt-2`}>{JSON.stringify(run.excluded_evidence, null, 2)}</pre>
          </details>
        )}
        <RunReportsTabClient />
      </article>
    </>
  );
}

function RequestTab({snapshot}: {snapshot: RunSnapshotServer}) {
  const {run, tickets, messages, conflicts} = snapshot;
  return (
    <>
      <JudgeDetailsGuide />
      <article className={panelClass()}>
        <div className={wsStep}>Run inputs</div>
        <p className="text-sm text-muted-foreground">
          Scenario <span className="font-medium text-foreground">{run.scenario_id}</span> · tracking ID for logs{" "}
          <span className="font-mono text-xs">{run.correlation_id}</span>
        </p>
      <h3 className="mt-4 text-sm font-semibold text-foreground">Original request</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {run.request_text || "No custom request text — the scenario’s built-in demo request was used."}
      </p>
      {run.approval && (
        <p className="mt-4 text-sm text-muted-foreground">
          Human approval record: <span className="text-foreground">{run.approval.status}</span>
          {run.approval.reason ? ` — ${run.approval.reason}` : ""}
        </p>
      )}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Raw JSON (optional)</summary>
        <p className={`${wsMeta} mt-2`}>For engineers matching this screen to API responses — judges can skip this block.</p>
        <pre className={`${wsPre} mt-2`}>
          {JSON.stringify(
            {run, counts: {tickets: tickets.length, messages: messages.length, conflicts: conflicts.length}},
            null,
            2,
          )}
        </pre>
      </details>
    </article>
    </>
  );
}

export function RunDetailTabPanel({
  tab,
  snapshot,
  autoRefresh,
  fetchedAt,
}: PanelProps & {tab: RunDetailTabId}) {
  switch (tab) {
    case "guide":
      return <GuideTab snapshot={snapshot} autoRefresh={autoRefresh} fetchedAt={fetchedAt} />;
    case "story":
      return <StoryTab snapshot={snapshot} />;
    case "queue":
      return <QueueTab snapshot={snapshot} />;
    case "dialogue":
      return <DialogueTab snapshot={snapshot} />;
    case "approve":
      return <ApproveTab snapshot={snapshot} />;
    case "reports":
      return <ReportsTab snapshot={snapshot} />;
    case "request":
      return <RequestTab snapshot={snapshot} />;
    default:
      return <GuideTab snapshot={snapshot} autoRefresh={autoRefresh} fetchedAt={fetchedAt} />;
  }
}
