import {cookies} from "next/headers";
import {OverviewLatestServerPanel} from "./OverviewLatestServerPanel";
import {OverviewPageClient} from "./OverviewPageClient";
import {fetchRunSnapshotServer, RUN_LATEST_COOKIE} from "@/lib/server-change-society";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const jar = await cookies();
  const latestId = jar.get(RUN_LATEST_COOKIE)?.value ?? jar.get("change-society-active-run")?.value ?? null;
  const snapshot = latestId ? await fetchRunSnapshotServer(latestId) : null;

  return (
    <>
      <OverviewLatestServerPanel snapshot={snapshot} runId={latestId} />
      <OverviewPageClient />
    </>
  );
}
