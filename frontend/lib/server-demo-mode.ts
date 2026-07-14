/** Align with API default: demo auto-approve on unless explicitly disabled. */
export function isServerDemoAutoApprove(): boolean {
  const raw =
    process.env.CHANGE_SOCIETY_DEMO_AUTO_APPROVE ??
    process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEMO_AUTO_APPROVE ??
    "1";
  return !["0", "false", "no"].includes(raw.toLowerCase());
}
