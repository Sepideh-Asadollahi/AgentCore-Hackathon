"use client";

import {useMemo} from "react";
import {humanRunStateLabel} from "@/lib/demo-state";
import type {ScenarioRunAvailability} from "@/lib/run-report-storage";
import {wsFieldLabel, wsMeta} from "@/lib/workspace-ui";

export type RunViewSource = "live" | "snapshot";

type Props = {
  scenarioTitle: string;
  availability: ScenarioRunAvailability;
  activeSource: RunViewSource | null;
  activeRunId: string | null;
  disabled?: boolean;
  onSelectSource: (source: RunViewSource) => void;
  className?: string;
};

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
  } catch {
    return iso;
  }
}

function shortRunId(runId: string): string {
  if (runId.length <= 14) return runId;
  return `${runId.slice(0, 8)}…${runId.slice(-4)}`;
}

/** Pick saved browser snapshot vs last live API run for the selected demo scenario. */
export function ScenarioRunPicker({
  scenarioTitle,
  availability,
  activeSource,
  activeRunId,
  disabled,
  onSelectSource,
  className,
}: Props) {
  const {snapshot, live} = availability;

  const snapshotLabel = useMemo(() => {
    if (!snapshot) return null;
    return `${humanRunStateLabel(snapshot.run.state)} · saved ${formatSavedAt(snapshot.savedAt)}`;
  }, [snapshot]);

  const liveLabel = useMemo(() => {
    if (!live) return null;
    return `Run ${shortRunId(live.runId)} · linked ${formatSavedAt(live.updatedAt)}`;
  }, [live]);

  const nothingSaved = !snapshot && !live;

  return (
    <fieldset className={className} disabled={disabled}>
      <legend className={`${wsFieldLabel} mb-2 block`}>
        Which run to show for <span className="text-foreground">{scenarioTitle}</span>
      </legend>
      {nothingSaved ? (
        <p className={`${wsMeta} max-w-none`}>
          No finished run stored for this scenario yet. On the Run page, use <strong className="font-medium text-foreground">Run new demo</strong>.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {snapshot && (
            <label className="flex min-w-[14rem] flex-1 cursor-pointer items-start gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2.5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="run-view-source"
                className="mt-1"
                checked={activeSource === "snapshot"}
                onChange={() => onSelectSource("snapshot")}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Latest in database</span>
                <span className="mt-0.5 block text-muted-foreground">{snapshotLabel}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">Last society run saved for this scenario (PostgreSQL).</span>
                {activeSource === "snapshot" && activeRunId === snapshot.run.run_id && (
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{snapshot.run.run_id}</span>
                )}
              </span>
            </label>
          )}
          {live && (
            <label className="flex min-w-[14rem] flex-1 cursor-pointer items-start gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2.5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="run-view-source"
                className="mt-1"
                checked={activeSource === "live"}
                onChange={() => onSelectSource("live")}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Active session run</span>
                <span className="mt-0.5 block text-muted-foreground">{liveLabel}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">The run you started or loaded in this browser session.</span>
                {activeSource === "live" && activeRunId && (
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{activeRunId}</span>
                )}
              </span>
            </label>
          )}
        </div>
      )}
      {!nothingSaved && (
        <p className={`${wsMeta} mt-2 max-w-none`}>
          Each scenario keeps its own latest run in the database. Pick which copy the tabs should show.
        </p>
      )}
    </fieldset>
  );
}
