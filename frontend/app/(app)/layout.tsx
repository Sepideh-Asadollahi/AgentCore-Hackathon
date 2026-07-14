import ClientAppLayout from "./client-layout";
import {fetchDemoScenariosServer} from "@/lib/server-change-society";

/** Avoid fully static shell HTML without client hydration (see live-runs E2E). */
export const dynamic = "force-dynamic";

/** Do not wrap {children} in RouteTransition here — see frontend/docs/ui-shell-layout.md */
export default async function AppLayout({children}: {children: React.ReactNode}) {
  const initialScenarios = await fetchDemoScenariosServer();
  return <ClientAppLayout initialScenarios={initialScenarios}>{children}</ClientAppLayout>;
}
