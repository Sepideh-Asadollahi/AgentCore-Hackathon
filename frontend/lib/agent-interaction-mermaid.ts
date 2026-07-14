import type {AgentMessage} from "./api";
import {roleDisplayName} from "./demo-state";
import type {InteractionStep} from "./agent-interaction-graph";
import {buildInteractionGraph} from "./agent-interaction-graph";

/** Escape text for Mermaid node labels (double-quoted strings). */
export function escapeMermaidLabel(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/#/g, "No.")
    .replace(/\r?\n/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export type MermaidStepLabel = {
  stepNumber: number;
  headline: string;
};

/**
 * Chronological flowchart: one node per message, edges follow time order.
 * Role hand-offs appear in the node title (From → To).
 */
export function buildInteractionMermaid(
  messages: AgentMessage[],
  labelsByMessageId?: Map<string, MermaidStepLabel>,
): string {
  const {steps} = buildInteractionGraph(messages);
  if (steps.length === 0) {
    return "flowchart TD\n  empty[\"No messages yet\"]";
  }

  const lines: string[] = ["flowchart TD"];
  lines.push("  classDef rebuttal fill:#3d2a12,stroke:#f59e0b,color:#fef3c7");
  lines.push("  classDef decision fill:#2e1a4a,stroke:#a78bfa,color:#ede9fe");
  lines.push("  classDef highRisk stroke:#fb7185,stroke-width:2px");
  lines.push("  classDef selfLoop stroke:#22d3ee,stroke-dasharray:4 4");

  const nodeIds: string[] = [];
  const classAssignments: string[] = [];

  for (const step of steps) {
    const id = `m${step.index}`;
    nodeIds.push(id);
    const labelRow = labelsByMessageId?.get(step.messageId);
    const headline = escapeMermaidLabel(
      truncate(labelRow?.headline ?? step.summary, 72),
    );
    const stepNo = labelRow?.stepNumber ?? step.index + 1;
    const from = escapeMermaidLabel(roleDisplayName(step.senderRole));
    const to = step.isSelfLoop
      ? from
      : escapeMermaidLabel(roleDisplayName(step.recipientRole));
    const risk = escapeMermaidLabel(step.riskLevel);
    const title = `#${stepNo} ${from} → ${to}`;
    const body = `${headline} (${risk} risk)`;
    lines.push(`  ${id}["${title}<br/>${body}"]`);

    if (step.isRebuttal) classAssignments.push(`class ${id} rebuttal`);
    else if (step.isDecision) classAssignments.push(`class ${id} decision`);
    if (step.riskLevel === "high" || step.riskLevel === "critical") {
      classAssignments.push(`class ${id} highRisk`);
    }
    if (step.isSelfLoop) classAssignments.push(`class ${id} selfLoop`);
  }

  for (let i = 0; i < nodeIds.length - 1; i++) {
    lines.push(`  ${nodeIds[i]} --> ${nodeIds[i + 1]}`);
  }

  lines.push(...classAssignments);
  return lines.join("\n");
}

export function stepForMessage(steps: InteractionStep[], messageId: string | null): InteractionStep | null {
  if (!messageId) return null;
  return steps.find(s => s.messageId === messageId) ?? null;
}
