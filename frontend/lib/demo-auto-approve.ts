/** Matches backend `demo_policy.DEMO_AUTO_APPROVE_REASON` prefix. */
export const DEMO_AUTO_APPROVE_LABEL =
  "Demo auto-approve (display only). Production requires explicit human approval at the conflict gate.";

/** Single workspace banner copy (AppShell only — do not duplicate on run pages). */
export const DEMO_AUTO_APPROVE_BANNER_DETAIL =
  "Conflicts still appear in the UI for judges; the server auto-approves high-risk runs so the full pipeline can finish without clicking Approve.";

export function isDemoAutoApproveReason(reason: string | undefined | null): boolean {
  if (!reason) return false;
  return reason.toLowerCase().includes("demo auto-approve") || reason.toLowerCase().includes("display only");
}
