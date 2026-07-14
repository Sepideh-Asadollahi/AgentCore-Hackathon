"use client";

import {useEffect} from "react";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {abandonStaleRunSession} from "@/lib/run-session-cookies";

type Props = {
  staleRunId?: string | null;
};

/** Clears orphan cookies when SSR could not load the run (e.g. API restarted). */
export function AgentsPageClient({staleRunId}: Props) {
  useEffect(() => {
    if (staleRunId) abandonStaleRunSession();
  }, [staleRunId]);

  return <WorkspaceAlerts />;
}
