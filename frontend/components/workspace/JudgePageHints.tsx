import {panelClass, wsLead, wsStep} from "@/lib/workspace-ui";

import Link from "next/link";
import {runDetailTabHref} from "@/lib/run-detail-tabs";

type StoryGuideProps = {runId: string};

export function JudgeStoryGuide({runId}: StoryGuideProps) {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Agent Story</p>
      <h2 className="text-lg font-semibold text-foreground">Read the run like a case file</h2>
      <p className={`${wsLead} mt-2`}>
        Start with <strong className="text-foreground">what business problem</strong> this scenario tests, then read each
        agent message in order. The map on the right shows who sent what — click a step to highlight it.
      </p>
      <p className={`${wsLead} mt-3`}>
        If the run needs a person, open{" "}
        <Link href={runDetailTabHref(runId, "approve")} className="text-primary underline-offset-2 hover:underline">
          Review
        </Link>{" "}
        for a short disagreement summary and Approve / Reject / Request changes.
      </p>
    </article>
  );
}

export function JudgeReviewGuide({runId}: StoryGuideProps) {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Review</p>
      <h2 className="text-lg font-semibold text-foreground">Where risk disagreements surface — and where you decide</h2>
      <p className={`${wsLead} mt-2`}>
        For the full narrative, open{" "}
        <Link href={runDetailTabHref(runId, "story")} className="text-primary underline-offset-2 hover:underline">
          Agent Story
        </Link>{" "}
        first. This tab shows a compact summary of each specialist’s position, any recorded disagreement, and approval
        buttons when the run is waiting for you.
      </p>
      <p className={`${wsLead} mt-3`}>
        The <strong className="text-foreground">Messages</strong> tab lists the same content in technical form for audit.
        In <strong className="text-foreground">demo display mode</strong> the server may auto-approve so the demo can finish;
        in production a human would decide here.
      </p>
    </article>
  );
}

export function JudgeResultsGuide() {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Results</p>
      <h2 className="text-lg font-semibold text-foreground">Measurable outcomes on the demo rubric</h2>
      <p className={`${wsLead} mt-2`}>
        After completion, you see how well the multi-agent run covered{" "}
        <strong className="text-foreground">serious impacts</strong> and{" "}
        <strong className="text-foreground">policy checks</strong>, how many specialist messages were exchanged, and total
        tokens (a rough cost signal). Higher percentages on the first two rows usually mean more of the scenario’s expected
        risks were found.
      </p>
      <p className={`${wsLead} mt-3`}>
        Press <strong className="text-foreground">Compare with single agent</strong> to run the same scenario with one agent
        only, then read the table — judges can compare coverage vs token use side by side. The decision JSON and excluded
        evidence lists are the auditable outputs a real release process could store.
      </p>
    </article>
  );
}

export function JudgeQueueGuide() {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Work Queue</p>
      <h2 className="text-lg font-semibold text-foreground">Proof that work was routed, not one hidden prompt</h2>
      <p className={`${wsLead} mt-2`}>
        Each row is a task the coordinator assigned to a named agent. Expand a row for a plain-English explanation of that
        step. Status badges show whether the task is still running or finished — that is the orchestration story judges
        should verify.
      </p>
    </article>
  );
}

export function JudgeMessagesGuide() {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Messages</p>
      <h2 className="text-lg font-semibold text-foreground">Technical audit trail</h2>
      <p className={`${wsLead} mt-2`}>
        Same specialist exchanges as Agent Story, in raw form. Expand a row for the written summary and{" "}
        <strong className="text-foreground">evidence IDs</strong> (links to catalog entries the agent cited). Use this tab
        when you need to verify citations, not when you want the guided narrative.
      </p>
    </article>
  );
}

export function JudgeDetailsGuide() {
  return (
    <article className={`${panelClass()} mb-4 border-primary/20`}>
      <p className={wsStep}>For judges — Details</p>
      <h2 className="text-lg font-semibold text-foreground">Inputs and IDs</h2>
      <p className={`${wsLead} mt-2`}>
        The scenario name, the original change request text, human approval record, and optional raw JSON for matching this
        screen to API responses or server logs.
      </p>
    </article>
  );
}
