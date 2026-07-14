import type {Scenario} from "@/lib/api";
import {domainLabel, scenarioBeatNarration} from "@/lib/scenario-cinematic";

export type RunsJudgeIntroContent = {
  headline: string;
  paragraphs: string[];
  watchItems: string[];
};

function humanizeFeatureSlug(slug: string): string {
  return slug
    .split("_")
    .map(word => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Judge copy on the Run page — updates when the selected demo scenario changes. */
export function buildRunsJudgeIntroContent(
  scenario: Scenario | undefined,
  scenariosLoading: boolean,
): RunsJudgeIntroContent {
  if (scenariosLoading && !scenario) {
    return {
      headline: "What happens when you click Start",
      paragraphs: [
        "Loading demo scenarios from the API. After they appear, this guide follows whichever demo you pick in the selector below.",
        "Run new demo POSTs immediately; Load latest demo reopens the last saved run for the selected scenario.",
      ],
      watchItems: [],
    };
  }

  if (!scenario) {
    return {
      headline: "What happens when you click Start",
      paragraphs: [
        "Connect the API (Settings → Test connection), then pick a demo scenario. This guide updates per demo.",
        "Run new demo POSTs a fresh society run. Load latest demo opens the previous test for the scenario you pick.",
      ],
      watchItems: [],
    };
  }

  const scenarioHook =
    scenarioBeatNarration(scenario, "request") ??
    `The default request: ${scenario.default_request.slice(0, 200)}${scenario.default_request.length > 200 ? "…" : ""}`;

  const negotiationNote = scenario.requires_negotiation
    ? " Specialists may negotiate and rebut before the run can finish."
    : "";

  return {
    headline: scenario.title,
    paragraphs: [
      `Demo domain: ${domainLabel(scenario.domain)}. ${scenarioHook}${negotiationNote} When you click Run new demo, the API creates a society run: a coordinator assigns durable tickets to context, change, impact, policy, and optionally frontend-delivery agents. Each step produces evidence-backed protocol messages; disagreements become conflicts a human must resolve—that is the governance story, not one chat reply.`,
      `Use Load latest demo to reopen the last saved run for this scenario without starting a new test. Use Run new demo to POST a fresh society run and land on Work queue (Guide, Work Queue, Messages, Review, Results, Details). Hackathon display mode auto-approves high-risk steps on the server (display only—not for production). No API keys are required on the deterministic demo path.`,
    ],
    watchItems: scenario.feature_demonstrations.map(humanizeFeatureSlug),
  };
}
