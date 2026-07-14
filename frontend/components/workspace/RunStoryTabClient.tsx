"use client";

import {AgentInteractionFlowGraph} from "@/components/workspace/AgentInteractionFlowGraph";
import {useRunWorkspace} from "@/lib/run-workspace";

/** Agent Story tab — scenario problem, timeline, and flow map. */
export function RunStoryTabClient() {
  const ws = useRunWorkspace();
  const run = ws.run;
  const scenario = ws.scenarios.find(s => s.scenario_id === run?.scenario_id) ?? ws.selected;

  if (!run) {
    return <p className="text-sm text-muted-foreground">Open a run to see the agent story (timeline and map).</p>;
  }

  if (ws.messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Specialist messages will appear here as the run progresses. Refresh or wait if the run is still active.
      </p>
    );
  }

  return (
    <AgentInteractionFlowGraph
      run={run}
      scenario={scenario}
      messages={ws.messages}
      conflicts={ws.conflicts}
      className="mt-0"
    />
  );
}
