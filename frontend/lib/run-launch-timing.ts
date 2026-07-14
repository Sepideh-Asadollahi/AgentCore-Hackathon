/** Client polling budget while a society run executes on the server (async create + GET poll). */

const DEFAULT_POLL_MS = 900_000;

export function societyRunLaunchPollDeadlineMs(): number {
  const raw = process.env.NEXT_PUBLIC_SOCIETY_RUN_POLL_MS?.trim();
  if (!raw) return DEFAULT_POLL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) return DEFAULT_POLL_MS;
  return parsed;
}

export function societyRunLaunchPollIntervalMs(): number {
  return 900;
}

/** POST create should return quickly when API uses async_run_create (no long-held HTTP). */
export function societyRunCreateMaxWaitMs(): number {
  return 45_000;
}
