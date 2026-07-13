export type EvaluationMetrics = {
  critical_impact_recall?: number;
  policy_match_recall?: number;
  task_completeness?: number;
  unsupported_claim_count?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  raw?: Record<string, number>;
};

export type AblationVariant = {
  variant_id: string;
  label: string;
  description?: string;
  note?: string;
  metrics: EvaluationMetrics;
};

export type BaselineEvaluation = {
  scenario_id?: string;
  baseline?: EvaluationMetrics;
  society?: EvaluationMetrics;
  tradeoffs?: Record<string, number>;
  ablation?: {
    variants?: AblationVariant[];
    efficiency?: Record<string, unknown>;
    methodology?: string;
  };
  caveat?: string;
};

export function parseBaselineEvaluation(data: Record<string, unknown> | null): BaselineEvaluation | null {
  if (!data) return null;
  return data as BaselineEvaluation;
}

export function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function variantRows(evaluation: BaselineEvaluation): AblationVariant[] {
  const fromAblation = evaluation.ablation?.variants ?? [];
  if (fromAblation.length > 0) return fromAblation;
  return [
    {
      variant_id: "single_agent",
      label: "Single agent baseline",
      metrics: evaluation.baseline ?? {},
    },
    {
      variant_id: "full_change_society",
      label: "Full Change Society",
      metrics: evaluation.society ?? {},
    },
  ];
}
