import type {
  AgentMessage,
  AgentTicket,
  Conflict,
  FrontendDelivery,
  ManagedAgent,
  Scenario,
  SocietyRun,
} from "@/lib/api";
import type {StatusTone} from "@/lib/demo-state";
import type {RunLaunchPhase} from "@/lib/run-progress-steps";
import type {SavedRunReport, ScenarioRunAvailability} from "@/lib/run-report-storage";
import type {RunViewSource} from "@/components/workspace/ScenarioRunPicker";

export type {StatusTone};

export type SelectScenarioRunViewOptions = {
  navigateToAgents?: boolean;
  scenarioId?: string;
};

export type RunWorkspaceValue = {
  scenarios: Scenario[];
  scenariosLoading: boolean;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  selected: Scenario | undefined;
  requestText: string;
  setRequestText: (text: string) => void;
  run: SocietyRun | null;
  messages: AgentMessage[];
  conflicts: Conflict[];
  agents: ManagedAgent[];
  tickets: AgentTicket[];
  frontendDelivery: FrontendDelivery | null;
  evaluation: Record<string, unknown> | null;
  busy: boolean;
  runRefreshing: boolean;
  lastRefreshAt: number | null;
  latestSavedReport: SavedRunReport | null;
  error: string;
  correlationId: string;
  runtimeLabel: string;
  demoAutoApprove: boolean;
  viewState: string;
  runLaunchOpen: boolean;
  runLaunchPhase: RunLaunchPhase;
  runLaunchError: string | null;
  runLaunchTargetRunId: string | null;
  dismissRunLaunch: () => void;
  openRunLaunchWorkQueue: () => void;
  resetRunDialogOpen: boolean;
  setResetRunDialogOpen: (open: boolean) => void;
  runDetailDialogOpen: boolean;
  setRunDetailDialogOpen: (open: boolean) => void;
  start: () => Promise<void>;
  loadLatestDemo: () => Promise<void>;
  decide: (action: "approve" | "reject" | "request-changes") => Promise<void>;
  evaluate: () => Promise<void>;
  resetRun: () => void;
  onScenarioChange: (id: string) => void;
  confirmResetRun: () => void;
  runViewSource: RunViewSource | null;
  setRunViewSource: (source: RunViewSource | null) => void;
  scenarioRunAvailability: ScenarioRunAvailability;
  selectScenarioRunView: (source: RunViewSource, options?: SelectScenarioRunViewOptions) => Promise<void>;
};
