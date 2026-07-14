"use client";

import {parseBaselineEvaluation, pct, variantRows} from "../lib/evaluation-view";
import {panelClass, wsMeta, wsStep} from "@/lib/workspace-ui";

type Props = {
  evaluation: Record<string, unknown>;
  compact?: boolean;
};

export function AblationComparisonTable(props: Props) {
  const parsed = parseBaselineEvaluation(props.evaluation);
  if (!parsed) return null;

  const rows = variantRows(parsed);
  const efficiency = parsed.ablation?.efficiency as Record<string, number> | undefined;

  return (
    <div className={`${panelClass()} mt-4`}>
      <div className={wsStep}>Evaluation</div>
      <h4 className="text-sm font-semibold text-foreground">Society vs single-agent comparison</h4>
      <p className={`${wsMeta} mt-1 max-w-none`}>
        Same scenario — multi-agent run vs one agent alone. Higher percentages on the first columns usually mean more
        expected risks and policies were found; uncited claims are statements without evidence IDs.
      </p>
      {parsed.scenario_id && <p className={`${wsMeta} mt-1`}>Scenario: {parsed.scenario_id}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3">
                Run type
              </th>
              <th scope="col" className="py-2 pr-3">
                Critical impacts found
              </th>
              <th scope="col" className="py-2 pr-3">
                Policy checks matched
              </th>
              <th scope="col" className="py-2 pr-3">
                Tasks completed
              </th>
              <th scope="col" className="py-2">
                Uncited claims
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.variant_id}
                className={`border-b border-border ${row.variant_id === "full_change_society" ? "bg-muted/30" : ""}`}
              >
                <th scope="row" className="py-2 pr-3 text-left text-xs font-semibold text-foreground">
                  {row.label}
                  {row.note && <small className={`${wsMeta} font-normal`}>{row.note}</small>}
                </th>
                <td className="py-2 pr-3">{pct(row.metrics.critical_impact_recall)}</td>
                <td className="py-2 pr-3">{pct(row.metrics.policy_match_recall)}</td>
                <td className="py-2 pr-3">{pct(row.metrics.task_completeness)}</td>
                <td className="py-2">{row.metrics.unsupported_claim_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!props.compact && parsed.tradeoffs && (
        <ul className={`${wsMeta} mt-3 list-disc space-y-1 pl-5`}>
          <li>
            Critical impacts found (society minus single agent):{" "}
            {parsed.tradeoffs.impact_recall_delta !== undefined
              ? `${parsed.tradeoffs.impact_recall_delta >= 0 ? "+" : ""}${Math.round(parsed.tradeoffs.impact_recall_delta * 100)} percentage points`
              : "—"}
          </li>
          <li>
            Policy checks matched (difference):{" "}
            {parsed.tradeoffs.policy_recall_delta !== undefined
              ? `${parsed.tradeoffs.policy_recall_delta >= 0 ? "+" : ""}${Math.round(parsed.tradeoffs.policy_recall_delta * 100)} percentage points`
              : "—"}
          </li>
          <li>Tokens used (difference): {parsed.tradeoffs.token_delta ?? "—"}</li>
        </ul>
      )}

      {efficiency && !props.compact && (
        <p className={`${wsMeta} mt-2`}>
          Critical risks found per 10,000 tokens — society: {efficiency.critical_risks_per_10k_tokens_society ?? "—"}, single
          agent: {efficiency.critical_risks_per_10k_tokens_baseline ?? "—"}
        </p>
      )}

      {parsed.caveat && <p className={`${wsMeta} mt-2`}>{parsed.caveat}</p>}
    </div>
  );
}
