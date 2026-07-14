import type {RunSnapshotServer} from "@/lib/server-change-society";
import {buildJudgeRunBrief, explainTicket, explainTicketLifecycle} from "@/lib/run-judge-narrative";
import {panelClass, wsLead, wsStep} from "@/lib/workspace-ui";

type Props = {
  snapshot: RunSnapshotServer;
};

/** Plain-language guide for hackathon judges (SSR-safe). */
export function JudgeRunGuide({snapshot}: Props) {
  const {run, messages, tickets, conflicts} = snapshot;
  const openConflicts = conflicts.filter(c => c.status !== "resolved").length;
  const brief = buildJudgeRunBrief(run, {
    messages: messages.length,
    tickets: tickets.length,
    conflicts: conflicts.length,
    openConflicts,
  });

  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>Judge walkthrough</p>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{brief.headline}</h2>
      <p className="mt-1 text-sm font-medium text-primary/90">Scenario: {run.scenario_id}</p>
      {brief.paragraphs.map((p, i) => (
        <p key={i} className={`${wsLead} mt-3`}>
          {p}
        </p>
      ))}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-foreground">What this demo is proving</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {brief.valueBullets.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="mt-5 rounded-lg border border-border/80 bg-muted/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Suggested path for judges</h3>
        <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          {brief.judgeTips.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function JudgeTicketExplanation({
  ticket,
}: {
  ticket: RunSnapshotServer["tickets"][number];
}) {
  const brief = explainTicket(ticket);
  const lifecycle = explainTicketLifecycle(ticket.events);
  return (
    <div className="mt-2 space-y-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">{brief.roleLabel} — </span>
        {brief.whatHappened}
      </p>
      <p>
        <span className="font-medium text-foreground">Why it matters: </span>
        {brief.whyItMatters}
      </p>
      <p>
        <span className="font-medium text-foreground">Progress: </span>
        {lifecycle}
      </p>
    </div>
  );
}
