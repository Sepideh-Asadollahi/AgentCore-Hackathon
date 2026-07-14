"use client";

import {useCallback, useEffect, useState} from "react";
import {X} from "lucide-react";
import {DEMO_AUTO_APPROVE_BANNER_DETAIL, DEMO_AUTO_APPROVE_LABEL} from "@/lib/demo-auto-approve";
import {useRunWorkspace} from "@/lib/run-workspace";
import {cn} from "@/lib/utils";

const DISMISS_KEY = "change-society-demo-banner-dismissed";

/** Visible disclaimer when the API is in hackathon demo auto-approve mode. */
export function DemoAutoApproveBanner() {
  const {demoAutoApprove} = useRunWorkspace();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ponytail: private mode — hide for this page load only
    }
  }, []);

  if (!demoAutoApprove || dismissed) return null;

  return (
    <div
      className="flex items-start gap-3 border-b border-amber-500/50 bg-amber-950/40 px-4 py-2.5 text-sm leading-relaxed text-amber-50/95 md:px-6"
      role="note"
    >
      <p className="min-w-0 flex-1">
        <strong className="font-semibold text-amber-100">Demo display mode: </strong>
        {DEMO_AUTO_APPROVE_LABEL} {DEMO_AUTO_APPROVE_BANNER_DETAIL}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className={cn(
          "shrink-0 rounded-md p-1.5 text-amber-100/80 transition-colors",
          "hover:bg-amber-900/50 hover:text-amber-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
        )}
        aria-label="Dismiss demo display mode notice"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
