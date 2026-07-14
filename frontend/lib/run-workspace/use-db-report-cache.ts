"use client";

import {useCallback, useMemo, useState} from "react";
import {fetchSavedRunReportForScenario} from "@/lib/run-report-api";
import {scenarioRunAvailability, type SavedRunReport} from "@/lib/run-report-storage";
import {wsLog} from "./logger";

export function useDbReportCache(scenarioId: string) {
  const [dbReportsByScenario, setDbReportsByScenario] = useState<Record<string, SavedRunReport>>({});
  const [storageRevision, setStorageRevision] = useState(0);
  const [latestSavedReport, setLatestSavedReport] = useState<SavedRunReport | null>(null);

  const bumpStorageRevision = useCallback(() => setStorageRevision(n => n + 1), []);

  const refreshDbReportForScenario = useCallback(
    async (sid: string): Promise<SavedRunReport | null> => {
      try {
        const report = await fetchSavedRunReportForScenario(sid);
        setDbReportsByScenario(prev => {
          const next = {...prev};
          if (report) next[sid] = report;
          else delete next[sid];
          return next;
        });
        if (report && sid === scenarioId) setLatestSavedReport(report);
        bumpStorageRevision();
        return report;
      } catch (err) {
        wsLog.warn("latest scenario run fetch failed", {
          scenarioId: sid,
          message: err instanceof Error ? err.message : "unknown",
        });
        return null;
      }
    },
    [scenarioId, bumpStorageRevision],
  );

  const scenarioRunAvailabilityState = useMemo(
    () => scenarioRunAvailability(scenarioId, dbReportsByScenario[scenarioId] ?? null),
    [scenarioId, dbReportsByScenario, storageRevision],
  );

  return {
    dbReportsByScenario,
    setDbReportsByScenario,
    latestSavedReport,
    setLatestSavedReport,
    bumpStorageRevision,
    refreshDbReportForScenario,
    scenarioRunAvailabilityState,
  };
}
