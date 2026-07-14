import type {RunSnapshotServer} from "@/lib/server-change-society";
import type {AgentMessage, AgentTicket, Conflict, ManagedAgent, SocietyRun} from "@/lib/api";

/** Build a run hub snapshot from client workspace state. */
export function workspaceToRunSnapshot(input: {
  run: SocietyRun;
  messages: AgentMessage[];
  tickets: AgentTicket[];
  conflicts: Conflict[];
  agents: ManagedAgent[];
}): RunSnapshotServer {
  return {
    run: input.run,
    messages: input.messages,
    tickets: input.tickets,
    conflicts: input.conflicts,
    agents: input.agents,
  };
}
