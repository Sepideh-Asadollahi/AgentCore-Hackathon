"use client";

import {OrgPolicyIntakePanel} from "@/components/OrgPolicyIntakePanel";
import {WorkspaceAlerts} from "@/components/workspace/WorkspaceOverlays";
import {useRunWorkspace} from "@/lib/run-workspace";
import {wsGridSingle} from "@/lib/workspace-ui";

export default function PolicyPage() {
  const ws = useRunWorkspace();
  return (
    <>
      <WorkspaceAlerts />
      <section className={wsGridSingle}>
        <OrgPolicyIntakePanel scenario={ws.selected ?? null} disabled={ws.busy || !!ws.run} />
      </section>
    </>
  );
}
