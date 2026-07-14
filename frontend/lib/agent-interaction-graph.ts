import type {AgentMessage} from "./api";

/** Canonical left-to-right order for society roles in the flow canvas. */
export const ROLE_COLUMN_ORDER = [
  "coordinator",
  "context_scout",
  "change_analyst",
  "impact_analyst",
  "policy_guardian",
  "frontend_delivery_lead",
] as const;

export type InteractionStep = {
  index: number;
  messageId: string;
  senderRole: string;
  recipientRole: string;
  messageType: string;
  capability: string;
  riskLevel: string;
  summary: string;
  evidenceCount: number;
  tokenTotal: number;
  createdAt: string | null;
  isSelfLoop: boolean;
  isRebuttal: boolean;
  isDecision: boolean;
};

export type RoleColumn = {
  role: string;
  column: number;
  sent: number;
  received: number;
};

/** Per-step geometry derived from roles + sequence (single source for SVG + cards). */
export type StepPlacement = {
  messageId: string;
  centerY: number;
  cardLeft: number;
  cardTop: number;
  cardWidth: number;
  cardHeight: number;
  edgePath: string;
};

export type InteractionGraphLayout = {
  steps: InteractionStep[];
  roles: RoleColumn[];
  placements: StepPlacement[];
  width: number;
  height: number;
  columnWidth: number;
  columnGap: number;
  headerHeight: number;
  rowHeight: number;
  padding: number;
};

const COL_W = 168;
const COL_GAP = 20;
const PAD = 24;
const HEADER_H = 96;
const ROW_H = 128;
const CARD_INSET = 6;
const CARD_H = 104;

function messageSummary(message: AgentMessage): string {
  const payload = message.payload ?? {};
  const raw = payload.summary ?? payload.rationale ?? payload.verdict ?? payload.intent;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return message.message_type.replaceAll("_", " ");
}

function tokenTotal(message: AgentMessage): number {
  const usage = message.token_usage ?? {};
  let total = 0;
  for (const value of Object.values(usage)) {
    if (typeof value === "number" && !Number.isNaN(value)) total += value;
  }
  return total;
}

function sortMessages(messages: AgentMessage[]): AgentMessage[] {
  return [...messages].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.message_id.localeCompare(b.message_id);
  });
}

function roleColumnIndex(role: string, present: Set<string>): number {
  const ordered = ROLE_COLUMN_ORDER.filter(r => present.has(r));
  const extras = [...present].filter(r => !ROLE_COLUMN_ORDER.includes(r as (typeof ROLE_COLUMN_ORDER)[number])).sort();
  const all = [...ordered, ...extras];
  const idx = all.indexOf(role);
  return idx >= 0 ? idx : all.length;
}

export function columnLeftX(layout: InteractionGraphLayout, column: number): number {
  return layout.padding + column * (layout.columnWidth + layout.columnGap);
}

export function columnCenterX(layout: InteractionGraphLayout, column: number): number {
  return columnLeftX(layout, column) + layout.columnWidth / 2;
}

export function columnRightX(layout: InteractionGraphLayout, column: number): number {
  return columnLeftX(layout, column) + layout.columnWidth;
}

export function stepRowY(layout: InteractionGraphLayout, stepIndex: number): number {
  return layout.padding + layout.headerHeight + stepIndex * layout.rowHeight + layout.rowHeight / 2;
}

export function roleColumnFor(layout: InteractionGraphLayout, role: string): number {
  return layout.roles.find(r => r.role === role)?.column ?? roleColumnIndex(role, new Set(layout.roles.map(r => r.role)));
}

function messageEdgePath(
  layout: InteractionGraphLayout,
  senderCol: number,
  recipientCol: number,
  y: number,
  selfLoop: boolean,
): string {
  if (selfLoop) {
    const xCenter = columnCenterX(layout, senderCol);
    const xRight = columnRightX(layout, senderCol) - 4;
    const loopW = 36;
    return `M ${xRight} ${y} C ${xRight + loopW} ${y - 44}, ${xRight + loopW} ${y + 44}, ${xRight} ${y}`;
  }

  const x1 = columnRightX(layout, senderCol) - 2;
  const x2 = columnLeftX(layout, recipientCol) + 2;
  if (Math.abs(x2 - x1) < 8) {
    return `M ${x1} ${y} L ${x2} ${y}`;
  }
  const mid = (x1 + x2) / 2;
  const bend = Math.min(28, Math.abs(x2 - x1) * 0.12);
  return `M ${x1} ${y} C ${mid} ${y - bend}, ${mid} ${y + bend}, ${x2} ${y}`;
}

function buildPlacements(layout: Omit<InteractionGraphLayout, "placements">): StepPlacement[] {
  const full = layout as InteractionGraphLayout;
  return layout.steps.map(step => {
    const senderCol = roleColumnFor(full, step.senderRole);
    const recipientCol = roleColumnFor(full, step.recipientRole);
    const centerY = stepRowY(full, step.index);
    const cardLeft = columnLeftX(full, senderCol) + CARD_INSET;
    const cardWidth = layout.columnWidth - CARD_INSET * 2;
    const cardTop = centerY - CARD_H / 2;

    return {
      messageId: step.messageId,
      centerY,
      cardLeft,
      cardTop,
      cardWidth,
      cardHeight: CARD_H,
      edgePath: messageEdgePath(full, senderCol, recipientCol, centerY, step.isSelfLoop),
    };
  });
}

export function buildInteractionGraph(messages: AgentMessage[]): InteractionGraphLayout {
  const sorted = sortMessages(messages);
  const present = new Set<string>();
  for (const m of sorted) {
    present.add(m.sender_role);
    present.add(m.recipient_role);
  }

  const orderedRoles = [
    ...ROLE_COLUMN_ORDER.filter(r => present.has(r)),
    ...[...present]
      .filter(r => !ROLE_COLUMN_ORDER.includes(r as (typeof ROLE_COLUMN_ORDER)[number]))
      .sort(),
  ];

  const sent = new Map<string, number>();
  const received = new Map<string, number>();
  for (const m of sorted) {
    sent.set(m.sender_role, (sent.get(m.sender_role) ?? 0) + 1);
    received.set(m.recipient_role, (received.get(m.recipient_role) ?? 0) + 1);
  }

  const roles: RoleColumn[] = orderedRoles.map((role, column) => ({
    role,
    column,
    sent: sent.get(role) ?? 0,
    received: received.get(role) ?? 0,
  }));

  const steps: InteractionStep[] = sorted.map((message, index) => {
    const type = message.message_type;
    return {
      index,
      messageId: message.message_id,
      senderRole: message.sender_role,
      recipientRole: message.recipient_role,
      messageType: type,
      capability: message.capability,
      riskLevel: message.risk_level,
      summary: messageSummary(message),
      evidenceCount: message.evidence_refs?.length ?? 0,
      tokenTotal: tokenTotal(message),
      createdAt: message.created_at ?? null,
      isSelfLoop: message.sender_role === message.recipient_role,
      isRebuttal: type.includes("rebuttal"),
      isDecision: type === "coordinator_decision" || type === "approval_decided" || type === "run_completed",
    };
  });

  const colCount = Math.max(roles.length, 1);
  const width = PAD * 2 + colCount * COL_W + (colCount - 1) * COL_GAP;
  const height = PAD + HEADER_H + steps.length * ROW_H + PAD;

  const base = {
    steps,
    roles,
    width,
    height,
    columnWidth: COL_W,
    columnGap: COL_GAP,
    headerHeight: HEADER_H,
    rowHeight: ROW_H,
    padding: PAD,
  };

  const placements = buildPlacements(base);

  return {...base, placements};
}
