"use client";

import {useRunWorkspace} from "@/lib/run-workspace";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog";
import {RunProgressDialog} from "@/components/workspace/RunProgressDialog";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import {getApiBaseUrl} from "@/lib/api";
import {wsAlertError, wsAlertWarn, wsMeta} from "@/lib/workspace-ui";

export function WorkspaceAlerts() {
  const {viewState, error, correlationId, scenariosLoading} = useRunWorkspace();
  const apiBase = typeof window !== "undefined" ? getApiBaseUrl() : "";

  return (
    <>
      {viewState === "degraded" && !scenariosLoading && (
        <div className={wsAlertWarn} role="status">
          <p className="font-medium text-amber-100">Backend not reachable from this browser.</p>
          <p className="mt-1 text-sm leading-relaxed">
            Effective API base: <span className="font-mono text-xs">{apiBase || "—"}</span>. Start the API with{" "}
            <span className="font-mono text-xs">python run.py</span> in <span className="font-mono text-xs">hackathon/</span>{" "}
            (port 32500). Prefer Settings → proxy mode, then reload. Use Settings → Test connection after the API is up.
          </p>
        </div>
      )}
      {error && (
        <div className={wsAlertError} role="alert">
          {error}
          {correlationId && <div className={wsMeta}>Correlation ID: {correlationId}</div>}
        </div>
      )}
    </>
  );
}

export function WorkspaceModals() {
  const ws = useRunWorkspace();

  return (
    <>
      <RunProgressDialog />

      <AlertDialog open={ws.resetRunDialogOpen} onOpenChange={ws.setResetRunDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear session run?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the active run from the browser session. Backend history is unchanged; you can start a new run
              afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={ws.confirmResetRun}>Clear run</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {ws.run && (
        <Dialog open={ws.runDetailDialogOpen} onOpenChange={ws.setRunDetailDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Active run</DialogTitle>
              <DialogDescription>Current society run bound to this browser session.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Scenario: </span>
                {ws.run.scenario_id}
              </p>
              <p>
                <span className="text-muted-foreground">State: </span>
                {ws.run.state}
              </p>
              <p className="font-mono text-xs break-all text-muted-foreground">{ws.run.run_id}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => ws.setRunDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
