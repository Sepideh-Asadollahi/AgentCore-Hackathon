import type {RunDetailTabId} from "@/lib/run-detail-tabs";
import type {RunSnapshotServer} from "@/lib/server-change-society";
import {RunDetailTabBar} from "@/components/workspace/RunDetailTabBar";
import {RunDetailTabPanel} from "@/components/workspace/RunDetailTabViews";
import {panelClass, wsEmpty, wsGridSingle, wsStep} from "@/lib/workspace-ui";

type Props = {
  snapshot: RunSnapshotServer | null;
  runId: string | null;
  tab: RunDetailTabId;
  autoRefresh: boolean;
  fetchedAt: string;
  loadError?: string;
};

/** SSR run hub — tabbed views work without client JavaScript. */
export function AgentsRunServerPanel({snapshot, runId, tab, autoRefresh, fetchedAt, loadError}: Props) {
  if (!runId) {
    return (
      <section className={wsGridSingle}>
        <article className={panelClass()}>
          <div className={wsStep}>Run detail</div>
          <div className={wsEmpty}>
            Pick a demo scenario above, choose saved or live data, then open tabs below — or start from the Run page.
          </div>
        </article>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className={wsGridSingle}>
        <article className={panelClass()}>
          <div className={wsStep}>Run detail</div>
          <div className={wsEmpty}>
            Could not load run <span className="font-mono text-xs">{runId}</span>
            {loadError ? ` (${loadError}).` : "."} The API no longer has this run (often after restart). On Run, pick the
            same scenario and choose <span className="text-foreground">Latest in database</span>, or run a new demo.
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className={wsGridSingle}>
      {autoRefresh && <meta httpEquiv="refresh" content="4" />}
      <RunDetailTabBar runId={runId} activeTab={tab} />
      <RunDetailTabPanel tab={tab} snapshot={snapshot} autoRefresh={autoRefresh} fetchedAt={fetchedAt} />
    </section>
  );
}
