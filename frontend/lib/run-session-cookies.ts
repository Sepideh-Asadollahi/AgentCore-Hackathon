import {RUN_ACTIVE_COOKIE, RUN_LATEST_COOKIE} from "@/lib/server-change-society";

const RUN_STORAGE_KEY = "change-society-active-run";
const COOKIE_OPTS = "path=/; max-age=604800; samesite=lax";

export function readRunCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setRunSessionCookies(runId: string): void {
  const encoded = encodeURIComponent(runId);
  document.cookie = `${RUN_ACTIVE_COOKIE}=${encoded}; ${COOKIE_OPTS}`;
  document.cookie = `${RUN_LATEST_COOKIE}=${encoded}; ${COOKIE_OPTS}`;
  sessionStorage.setItem(RUN_STORAGE_KEY, runId);
}

export function clearActiveRunSession(): void {
  sessionStorage.removeItem(RUN_STORAGE_KEY);
  document.cookie = `${RUN_ACTIVE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Drop browser pointers to a run (active + latest cookies and session). */
export function clearAllRunSessionPointers(): void {
  clearActiveRunSession();
  document.cookie = `${RUN_LATEST_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Remove `run` from the query string (keeps other params such as `tab`). */
export function stripRunIdFromBrowserUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("run")) return;
  url.searchParams.delete("run");
  const qs = url.searchParams.toString();
  const next = url.pathname + (qs ? `?${qs}` : "") + url.hash;
  window.history.replaceState(null, "", next);
}

/** Clear cookies/session and drop stale `?run=` so bootstrap does not retry a dead run. */
export function abandonStaleRunSession(): void {
  clearAllRunSessionPointers();
  stripRunIdFromBrowserUrl();
}

/** Active run id from URL, session, or cookies (active, then latest). */
export function readBrowserStoredRunId(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("run")?.trim();
  if (fromUrl) return fromUrl;
  const fromSession = sessionStorage.getItem(RUN_STORAGE_KEY);
  if (fromSession) return fromSession;
  return readRunCookie(RUN_ACTIVE_COOKIE) || readRunCookie(RUN_LATEST_COOKIE);
}
