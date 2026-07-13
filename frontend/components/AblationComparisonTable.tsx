"use client";

import {parseBaselineEvaluation, pct, variantRows} from "../lib/evaluation-view";

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
    <div className="ablation-table-wrap">
      <h4 className="ablation-table-title">Baseline & ablation comparison</h4>
      {parsed.scenario_id && (
        <p className="meta ablation-scenario">Scenario: {parsed.scenario_id}</p>
      )}
      <div className="ablation-table-scroll">
        <table className="ablation-table">
          <thead>
            <tr>
              <th scope="col">Variant</th>
              <th scope="col">Impact recall</th>
              <th scope="col">Policy recall</th>
              <th scope="col">Tasks</th>
              <th scope="col">Unsupported claims</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.variant_id} className={row.variant_id === "full_change_society" ? "highlight" : ""}>
                <th scope="row">
                  {row.label}
                  {row.note && <small>{row.note}</small>}
                </th>
                <td>{pct(row.metrics.critical_impact_recall)}</td>
                <td>{pct(row.metrics.policy_match_recall)}</td>
                <td>{pct(row.metrics.task_completeness)}</td>
                <td>{row.metrics.unsupported_claim_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!props.compact && parsed.tradeoffs && (
        <ul className="ablation-tradeoffs meta">
          <li>
            Impact recall Δ (society − baseline):{" "}
            {parsed.tradeoffs.impact_recall_delta !== undefined
              ? `${parsed.tradeoffs.impact_recall_delta >= 0 ? "+" : ""}${Math.round(parsed.tradeoffs.impact_recall_delta * 100)} pp`
              : "—"}
          </li>
          <li>
            Policy recall Δ:{" "}
            {parsed.tradeoffs.policy_recall_delta !== undefined
              ? `${parsed.tradeoffs.policy_recall_delta >= 0 ? "+" : ""}${Math.round(parsed.tradeoffs.policy_recall_delta * 100)} pp`
              : "—"}
          </li>
          <li>Token Δ: {parsed.tradeoffs.token_delta ?? "—"}</li>
        </ul>
      )}

      {efficiency && !props.compact && (
        <p className="meta ablation-efficiency">
          Critical risks per 10K tokens — society: {efficiency.critical_risks_per_10k_tokens_society ?? "—"}, baseline:{" "}
          {efficiency.critical_risks_per_10k_tokens_baseline ?? "—"}
        </p>
      )}

      {parsed.caveat && <p className="meta ablation-caveat">{parsed.caveat}</p>}
    </div>
  );
}
