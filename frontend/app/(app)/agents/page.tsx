import {cookies} from "next/headers";
import {AgentsRunClientHub} from "./AgentsRunClientHub";
import {
  fetchRunSnapshotServer,
  RUN_ACTIVE_COOKIE,
  RUN_LATEST_COOKIE,
  shouldAutoRefreshRunPage,
} from "@/lib/server-change-society";
import {parseRunDetailTab} from "@/lib/run-detail-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{run?: string; tab?: string}>;
};

export default async function AgentsPage({searchParams}: PageProps) {
  const sp = await searchParams;
  const jar = await cookies();
  const runId =
    sp.run?.trim() ||
    jar.get(RUN_ACTIVE_COOKIE)?.value?.trim() ||
    jar.get(RUN_LATEST_COOKIE)?.value?.trim() ||
    null;
  const tab = parseRunDetailTab(sp.tab);

  const snapshot = runId ? await fetchRunSnapshotServer(runId) : null;
  const autoRefresh = snapshot != null && shouldAutoRefreshRunPage(snapshot.run.state);
  const fetchedAt = new Date().toISOString();

  return (
    <AgentsRunClientHub
      runId={runId}
      tab={tab}
      ssrSnapshot={snapshot}
      autoRefresh={autoRefresh}
      fetchedAt={fetchedAt}
      loadError={runId && !snapshot ? "API error" : undefined}
      staleRunId={runId && !snapshot ? runId : null}
    />
  );
}
