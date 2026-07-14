"use client";

import {useMemo, useState} from "react";
import type {AgentMessage, Conflict, Scenario, SocietyRun} from "@/lib/api";
import {buildAgentExchangeStory, humanCapabilityLabel, humanRiskLabel} from "@/lib/agent-exchange-story";
import {buildInteractionGraph, columnCenterX, columnLeftX, type InteractionStep} from "@/lib/agent-interaction-graph";
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

function riskAccent(risk: string): string {
  const r = risk.toLowerCase();
  if (r === "high" || r === "critical") return "border-rose-500/70 shadow-[0_0_24px_-8px_oklch(0.62_0.22_25/0.55)]";
  if (r === "medium") return "border-amber-500/60 shadow-[0_0_20px_-10px_oklch(0.75_0.14_85/0.45)]";
  return "border-cyan-500/45 shadow-[0_0_18px_-12px_oklch(0.72_0.12_200/0.4)]";
}

function stepAccent(step: InteractionStep): string {
  if (step.isDecision) return "border-violet-500/65 bg-violet-950/35";
  if (step.isRebuttal) return "border-orange-500/60 bg-orange-950/30";
  if (step.messageType === "task_assignment") return "border-border/90 bg-muted/30";
  return "border-border/80 bg-background/80";
}

export function AgentInteractionFlowGraph({run, scenario, messages, conflicts = [], className}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const story = useMemo(
    () => buildAgentExchangeStory(run, messages, conflicts, scenario),
    [run, messages, conflicts, scenario],
  );
  const lineByMessageId = useMemo(() => new Map(story.lines.map(l => [l.messageId, l])), [story.lines]);
  const layout = useMemo(() => buildInteractionGraph(messages), [messages]);
  const conflictMessageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      for (const id of c.rebuttal_message_ids) ids.add(id);
    }
    return ids;
  }, [conflicts]);

  const selected =
    layout.steps.find(s => s.messageId === selectedId) ?? layout.steps[layout.steps.length - 1] ?? null;
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

      <div className="relative mt-6 overflow-x-auto rounded-xl border border-border/70 bg-gradient-to-b from-muted/20 via-background to-background p-2">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Visual map (same steps — scroll sideways if needed)
        </p>
        <div className="relative min-w-max" style={{width: layout.width, height: layout.height}}>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-border/70"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            <defs>
              <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" className="fill-primary/80" />
              </marker>
            </defs>
            {layout.roles.map(role => {
              const x = columnCenterX(layout, role.column);
              return (
                <line
                  key={role.role}
                  x1={x}
                  y1={layout.padding + layout.headerHeight - 8}
                  x2={x}
                  y2={layout.height - layout.padding}
                  stroke="currentColor"
                  strokeDasharray="4 6"
                  strokeWidth={1}
                  opacity={0.45}
                />
              );
            })}
            {layout.placements.map(placement => (
              <line
                key={`row-${placement.messageId}`}
                x1={layout.padding}
                y1={placement.centerY}
                x2={layout.width - layout.padding}
                y2={placement.centerY}
                stroke="currentColor"
                strokeWidth={1}
                opacity={0.12}
              />
            ))}
            {layout.placements.map((placement, i) => {
              const step = layout.steps[i];
              const highlighted =
                step.messageId === selected?.messageId || conflictMessageIds.has(step.messageId);
              return (
                <path
                  key={step.messageId}
                  d={placement.edgePath}
                  fill="none"
                  stroke={highlighted ? "oklch(0.72 0.14 250)" : "oklch(0.62 0.03 260 / 0.75)"}
                  strokeWidth={highlighted ? 2.25 : 1.75}
                  markerEnd={step.isSelfLoop ? undefined : "url(#flow-arrow)"}
                />
              );
            })}
          </svg>

          {layout.roles.map(role => {
            const left = columnLeftX(layout, role.column);
            return (
              <div
                key={role.role}
                className="absolute rounded-lg border border-border/80 bg-card/95 px-2 py-2 backdrop-blur-sm"
                style={{
                  left,
                  top: layout.padding,
                  width: layout.columnWidth,
                }}
              >
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
                  {roleDisplayName(role.role)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  sent {role.sent} · received {role.received}
                </p>
              </div>
            );
          })}

          {layout.steps.map((step, i) => {
            const placement = layout.placements[i];
            const active = step.messageId === selected?.messageId;
            const conflict = conflictMessageIds.has(step.messageId);
            const line = lineByMessageId.get(step.messageId);

            return (
              <button
                key={step.messageId}
                type="button"
                onClick={() => setSelectedId(step.messageId)}
                className={cn(
                  "absolute z-[1] rounded-lg border px-2 py-1.5 text-left transition-[transform,box-shadow,border-color]",
                  "hover:z-10 hover:scale-[1.01] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  stepAccent(step),
                  riskAccent(step.riskLevel),
                  active && "z-20 ring-2 ring-primary/50",
                  conflict && "outline outline-1 outline-amber-500/50",
                )}
                style={{
                  left: placement.cardLeft,
                  top: placement.cardTop,
                  width: placement.cardWidth,
                  height: placement.cardHeight,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">#{step.index + 1}</span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[9px] text-foreground">
                    {humanRiskLabel(step.riskLevel)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
                  {line?.headline ?? step.summary}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {line?.detail ?? step.summary}
                </p>
              </button>
            );
          })}
        </div>
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
