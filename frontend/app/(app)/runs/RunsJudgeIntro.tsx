"use client";

import {useEffect, useMemo} from "react";
import type {Scenario} from "@/lib/api";
import {createLogger} from "@/lib/app-logger";
import {buildRunsJudgeIntroContent} from "@/lib/runs-judge-intro";
import {panelClass, wsLead, wsMeta, wsStep} from "@/lib/workspace-ui";

const judgeLog = createLogger("runs-judge");

type Props = {
  scenarioId: string;
  scenarios: Scenario[];
  scenariosLoading: boolean;
};

/** Judge copy — keyed by scenarioId + scenarios list (same source as the selector). */
export function RunsJudgeIntroPanel({scenarioId, scenarios, scenariosLoading}: Props) {
  const scenario = useMemo(
    () => scenarios.find(s => s.scenario_id === scenarioId),
    [scenarios, scenarioId],
  );
  const introLoading = scenariosLoading && scenarios.length === 0;

  const copy = useMemo(
    () => buildRunsJudgeIntroContent(scenario, introLoading),
    [scenario, scenarioId, introLoading],
  );

  useEffect(() => {
    const resolvedId = scenario?.scenario_id ?? null;
    const mismatch = resolvedId != null && resolvedId !== scenarioId;
    judgeLog.info("intro props", {
      scenarioId,
      resolvedScenarioId: resolvedId,
      headline: copy.headline,
      scenariosLoading,
      introLoading,
      mismatch,
    });
    if (mismatch) {
      judgeLog.warn("scenarioId / selected scenario mismatch", {scenarioId, resolvedScenarioId: resolvedId});
    }
    if (!introLoading && !scenario) {
      judgeLog.warn("no scenario object for selector id", {scenarioId});
    }
  }, [scenarioId, scenario, scenariosLoading, introLoading, copy.headline]);

  return (
    <article
      key={scenarioId}
      className={`${panelClass()} mt-4 border-primary/15`}
      aria-live="polite"
      data-demo-scenario={scenarioId}
    >
      <p className={wsStep}>For judges</p>
      <h2 className="text-lg font-semibold text-foreground">{copy.headline}</h2>
      {scenario && (
        <p className={`${wsMeta} mt-1`}>
          Selected demo: <span className="font-mono text-[11px]">{scenario.scenario_id}</span>
          {scenario.evidence_count > 0 && <> · {scenario.evidence_count} evidence items</>}
        </p>
      )}
      {copy.paragraphs.map((paragraph, index) => (
        <p key={`${scenarioId}-p-${index}`} className={`${wsLead} ${index === 0 ? "mt-2" : "mt-3"}`}>
          {paragraph}
        </p>
      ))}
      {copy.watchItems.length > 0 && (
        <>
          <p className={`${wsLead} mt-3 font-medium text-foreground`}>What this demo is meant to show</p>
          <ul className={`${wsLead} mt-2 list-disc space-y-1 ps-5`}>
            {copy.watchItems.map(item => (
              <li key={`${scenarioId}-${item}`}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/** @deprecated Use RunsJudgeIntroPanel with scenario props from RunsPageClient. */
export function RunsJudgeIntro() {
  return null;
}
