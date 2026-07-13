export type CinematicBeatId =
  | "intro"
  | "request"
  | "routing"
  | "dialogue"
  | "conflict"
  | "approval"
  | "frontend-handoff"
  | "outcome";

export type CinematicBeat = {
  id: CinematicBeatId;
  index: number;
  title: string;
  narration: string;
  caption: string;
};

export const CINEMATIC_BEATS: CinematicBeat[] = [
  {
    id: "intro",
    index: 0,
    title: "Control plane, not another chatbot",
    narration:
      "AgentCore registers external Qwen workers, routes durable tickets, and governs evidence-bound negotiation. You are watching a vendor-neutral control plane—not a single monolithic prompt.",
    caption: "Track 3 · Agent Society",
  },
  {
    id: "request",
    index: 1,
    title: "An innocent-looking change request",
    narration:
      "A checkout tax refactor reads like cleanup work. The golden scenario hides revenue risk: a base_price mutation can change what customers pay without anyone noticing in the diff title.",
    caption: "Golden scenario · pricing refactor",
  },
  {
    id: "routing",
    index: 2,
    title: "Decomposition into managed specialists",
    narration:
      "The Coordinator assigns capability-matched tickets to registered agents. Each role owns a bounded job—context retrieval, change interpretation, impact analysis, policy review, and reconciliation.",
    caption: "Managed agents · durable ticket lifecycle",
  },
  {
    id: "dialogue",
    index: 3,
    title: "Directed Universal Agent JSON exchange",
    narration:
      "Specialists speak a shared machine protocol. Messages carry evidence references, risk levels, and explicit recipients—so collaboration is inspectable, not a hidden chain-of-thought.",
    caption: "Universal Agent JSON v1",
  },
  {
    id: "conflict",
    index: 4,
    title: "Genuine disagreement, one rebuttal round",
    narration:
      "Change Analyst and Policy Guardian disagree on risk severity. Each side must cite evidence; the Coordinator requests exactly one bounded rebuttal before the Judge reconciles positions.",
    caption: "Conflict · rebuttal · evidence comparison",
  },
  {
    id: "approval",
    index: 5,
    title: "Fail-closed human boundary",
    narration:
      "High revenue risk cannot auto-ship. The run pauses in awaiting_approval until a human approver confirms the guarded plan—policy is deterministic, not negotiable by model output.",
    caption: "Human approval gate",
  },
  {
    id: "frontend-handoff",
    index: 6,
    title: "Automatic ticket for the frontend team",
    narration:
      "Backend or platform may merge API and behavior changes first. The Frontend Delivery Coordinator opens a durable control-plane ticket with UI, UX, API-client, and design tasks so the frontend team discovers required work without chasing Slack threads.",
    caption: "Frontend queue · UI/UX/API client handoff",
  },
  {
    id: "outcome",
    index: 7,
    title: "Measurable society vs single agent",
    narration:
      "Approved decisions become scoped memory for the next session. Metrics and baseline comparison show whether role decomposition improved impact and policy recall over one generic reviewer.",
    caption: "Tasks · memory · baseline",
  },
];

export function beatFromSignals(input: {
  hasRun: boolean;
  ticketCount: number;
  messageCount: number;
  conflictCount: number;
  awaitingApproval: boolean;
  completed: boolean;
  hasFrontendHandoff?: boolean;
}): CinematicBeatId {
  if (!input.hasRun) return "intro";
  if (input.completed) return "outcome";
  if (input.awaitingApproval && input.hasFrontendHandoff) return "frontend-handoff";
  if (input.awaitingApproval) return "approval";
  if (input.conflictCount > 0) return "conflict";
  if (input.messageCount > 0) return "dialogue";
  if (input.ticketCount > 0) return "routing";
  return "request";
}

export function beatById(id: CinematicBeatId): CinematicBeat {
  return CINEMATIC_BEATS.find(item => item.id === id) ?? CINEMATIC_BEATS[0];
}
