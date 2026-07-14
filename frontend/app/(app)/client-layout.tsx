"use client";

import {useEffect} from "react";
import {AppShell} from "@/components/AppShell";
import {RunWorkspaceProvider} from "@/lib/run-workspace";
import type {Scenario} from "@/lib/api";
import {configureAppLogging} from "@/lib/app-logger";
import {loadClientSettings} from "@/lib/client-settings";

export default function ClientAppLayout({
  children,
  initialScenarios = [],
}: {
  children: React.ReactNode;
  initialScenarios?: Scenario[];
}) {
  useEffect(() => {
    configureAppLogging(loadClientSettings());
  }, []);

  return (
    <RunWorkspaceProvider initialScenarios={initialScenarios}>
      <AppShell>{children}</AppShell>
    </RunWorkspaceProvider>
  );
}
