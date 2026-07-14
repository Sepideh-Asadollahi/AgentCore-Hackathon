"use client";

import type {ReactNode} from "react";
import type {Scenario} from "@/lib/api";
import {RunWorkspaceProviderInner} from "./context";
import {useRunWorkspaceState} from "./use-run-workspace";

export function RunWorkspaceProvider({
  children,
  initialScenarios = [],
}: {
  children: ReactNode;
  initialScenarios?: Scenario[];
}) {
  const value = useRunWorkspaceState(initialScenarios);
  return <RunWorkspaceProviderInner value={value}>{children}</RunWorkspaceProviderInner>;
}
