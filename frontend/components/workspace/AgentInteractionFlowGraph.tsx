"use client";

import {useMemo, useState} from "react";
import type {AgentMessage, Conflict, Scenario, SocietyRun} from "@/lib/api";
import {buildAgentExchangeStory, humanCapabilityLabel, humanRiskLabel} from "@/lib/agent-exchange-story";
import {buildInteractionGraph} from "@/lib/agent-interaction-graph";
import {buildInteractionMermaid} from "@/lib/agent-interaction-mermaid";
import {AgentInteractionMermaidChart} from "@/components/workspace/AgentInteractionMermaidChart";
import {roleDisplayName} from "@/lib/demo-state";
import {panelClass, wsMeta, wsStep} from "@/lib/workspace-ui";
import {cn} from "@/lib/utils";

type Props = {
  run: SocietyRun;
  scenario?: Scenario | null;
  messages: AgentMessage[];
  conflicts?: Conflict[];
  className?: string;
};

export function AgentInteractionFlowGraph({run, scenario, messages, conflicts = [], className}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const story = useMemo(
    () => buildAgentExchangeStory(run, messages, conflicts, scenario),
    [run, messages, conflicts, scenario],
  );
  const lineByMessageId = useMemo(() => new Map(story.lines.map(l => [l.messageId, l])), [story.lines]);
  const layout = useMemo(() => buildInteractionGraph(messages), [messages]);
  const mermaidLabels = useMemo(
    () => new Map(story.lines.map(l => [l.messageId, {stepNumber: l.stepNumber, headline: l.headline}])),
    [story.lines],
  );
  const mermaidChart = useMemo(
    () => buildInteractionMermaid(messages, mermaidLabels),
    [messages, mermaidLabels],
  );

  const selected =
    layout.steps.find(s => s.messageId === selectedId) ?? layout.steps[layout.steps.length - 1] ?? null;
  const activeStepIndex = selected ? selected.index : null;
  const selectedLine = selected ? lineByMessageId.get(selected.messageId) : null;

  if (messages.length === 0) {
    return null;
  }

  return (
    <section className={cn(panelClass(), className ?? "mt-4")} aria-labelledby="agent-flow-title">
      <div className={wsStep}>For judges</div>
      <h3 id="agent-flow-title" className="text-base font-semibold text-foreground">
        What each agent said — and what problem this scenario tests
      </h3>
      <p className={`${wsMeta} max-w-none`}>
        Read top to bottom: first the business problem, then each phase in plain language. Click any step to highlight it
        in the visual map.
      </p>

      <div className="mt-4 rounded-xl border border-border/80 bg-muted/15 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What this demo is about</p>
        <h4 className="mt-1 text-base font-semibold text-foreground">{story.problem.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{story.problem.hook}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request submitted</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{story.problem.userAsk}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">What could go wrong</p>
            <ul className="mt-1 list-inside list-disc text-sm leading-relaxed text-foreground">
              {story.problem.stakes.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        {story.problem.policyPressure.length > 0 && (
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            <span className="font-semibold">Rules in play:</span> {story.problem.policyPressure.join(" · ")}
          </p>
        )}
      </div>

      {story.conflictPlain && (
        <div className="mt-3 rounded-lg border border-amber-500/45 bg-amber-950/25 px-4 py-3 text-sm leading-relaxed text-amber-50/95">
          <span className="font-semibold">Disagreement to notice: </span>
          {story.conflictPlain}
        </div>
      )}

      {story.outcomePlain && (
        <p className="mt-3 rounded-lg border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground">
          <span className="font-semibold">Bottom line: </span>
          {story.outcomePlain}
        </p>
      )}

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step-by-step story</p>
        {story.phases.map(phase => (
          <div key={phase.id} className="mt-4 rounded-lg border border-border/60 bg-background/30 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Phase {phase.phaseNumber}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{phase.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{phase.intent}</p>
            <ol className="mt-2 space-y-1.5">
              {story.lines
                .filter(l => l.phaseId === phase.id)
                .map(line => {
                  const active = line.messageId === selected?.messageId;
                  return (
                    <li key={line.messageId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(line.messageId)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/70 bg-background/40 hover:border-border hover:bg-muted/30",
                        )}
                      >
                        <span className="font-mono text-[10px] text-muted-foreground">Step {line.stepNumber}</span>
                        <span className="ml-2 font-medium text-foreground">{line.headline}</span>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{line.detail}</p>
                      </button>
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/70 bg-gradient-to-b from-muted/20 via-background to-background p-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Visual map (Mermaid — chronological flow)
        </p>
        <AgentInteractionMermaidChart chart={mermaidChart} activeStepIndex={activeStepIndex} />
      </div>

      {selected && selectedLine && (
        <div className="mt-4 rounded-lg border border-border/80 bg-background/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Focused step</p>
          <p className="mt-1 text-sm font-medium text-foreground">{selectedLine.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedLine.detail}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Job type</dt>
              <dd className="text-foreground">{humanCapabilityLabel(selected.capability)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Evidence cited</dt>
              <dd className="text-foreground">{selected.evidenceCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Model tokens</dt>
              <dd className="text-foreground">{selected.tokenTotal || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">From → to</dt>
              <dd className="text-foreground">
                {roleDisplayName(selected.senderRole)} →{" "}
                {selected.isSelfLoop ? roleDisplayName(selected.senderRole) : roleDisplayName(selected.recipientRole)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
