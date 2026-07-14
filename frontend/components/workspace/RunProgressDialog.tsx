"use client";

import {CheckCircle2, Circle, Loader2, XCircle} from "lucide-react";
import {useRunWorkspace} from "@/lib/run-workspace";
import {
  RUN_PROGRESS_STEPS,
  isRunLaunchBusy,
  resolveRunProgressStepStatus,
  runLaunchOutcomeLabel,
  type ProgressStepStatus,
} from "@/lib/run-progress-steps";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {cn} from "@/lib/utils";

function StepIcon({status, emphasizeDone}: {status: ProgressStepStatus; emphasizeDone?: boolean}) {
  const base = "mt-0.5 size-5 shrink-0";
  switch (status) {
    case "done":
      return (
        <CheckCircle2
          className={cn(base, emphasizeDone ? "text-emerald-300 drop-shadow-[0_0_8px_oklch(0.72_0.15_155/0.45)]" : "text-emerald-400")}
          aria-hidden
        />
      );
    case "active":
      return <Loader2 className={cn(base, "animate-spin text-primary")} aria-hidden />;
    case "error":
      return <XCircle className={cn(base, "text-destructive")} aria-hidden />;
    default:
      return <Circle className={cn(base, "text-muted-foreground/45")} aria-hidden />;
  }
}

export function RunProgressDialog() {
  const ws = useRunWorkspace();
  const busy = isRunLaunchBusy(ws.runLaunchPhase);
  const runState = ws.run?.state ?? null;
  const finished = ws.runLaunchPhase === "finished";
  const errored = ws.runLaunchPhase === "error";

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (busy) return;
    ws.dismissRunLaunch();
  };

  const title = finished
    ? "Society run complete"
    : errored
      ? "Society run failed"
      : "Society run in progress";

  return (
    <Dialog open={ws.runLaunchOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {ws.selected?.title ?? ws.scenarioId}
            {" — "}
            {finished || errored ? runLaunchOutcomeLabel(runState) : "Specialists are working through the steps below."}
          </DialogDescription>
        </DialogHeader>

        {finished && (
          <div
            className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100/95"
            role="status"
          >
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden />
            <span>All steps finished — you can close this dialog or open the Work queue.</span>
          </div>
        )}

        <ol className="max-h-[min(24rem,55vh)] space-y-2 overflow-y-auto pe-1" aria-live="polite">
          {RUN_PROGRESS_STEPS.map(step => {
            const status = resolveRunProgressStepStatus(step, ws.runLaunchPhase, runState);
            const isReadyStep = finished && step.id === "done";
            return (
              <li
                key={step.id}
                className={cn(
                  "flex gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  status === "active" && "border-primary/35 bg-primary/5",
                  status === "done" && !isReadyStep && "border-border/50 bg-muted/10",
                  status === "done" && isReadyStep && "border-emerald-500/40 bg-emerald-950/20",
                  status === "pending" && "border-transparent opacity-70",
                  status === "error" && "border-destructive/40 bg-destructive/5",
                )}
              >
                <StepIcon status={status} emphasizeDone={isReadyStep} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", isReadyStep ? "text-emerald-50" : "text-foreground")}>
                    {step.headline}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {ws.runLaunchError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ws.runLaunchError}
          </p>
        )}

        {ws.run?.run_id && (
          <p className="font-mono text-[10px] text-muted-foreground break-all">{ws.run.run_id}</p>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          {busy ? (
            <p className="w-full text-xs text-muted-foreground sm:mr-auto">Please keep this window open…</p>
          ) : null}
          {(finished || errored) && (
            <>
              <Button type="button" variant="outline" onClick={() => ws.dismissRunLaunch()}>
                Close
              </Button>
              {ws.runLaunchTargetRunId && !errored && (
                <Button type="button" onClick={() => ws.openRunLaunchWorkQueue()}>
                  Open Work queue
                </Button>
              )}
              {errored && ws.runLaunchTargetRunId && (
                <Button type="button" variant="secondary" onClick={() => ws.openRunLaunchWorkQueue()}>
                  Open run anyway
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
