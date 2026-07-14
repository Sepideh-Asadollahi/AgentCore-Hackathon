import {loadClientSettings, type ClientSettings} from "./client-settings";

const DEFAULT_PORT = "32500";
export const PROXY_PATH = "/change-society-api";

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** Resolve API base URL for fetch (honours saved client settings in the browser). */
export function getApiBaseUrl(settings?: ClientSettings): string {
  if (typeof window !== "undefined") {
    const s = settings ?? loadClientSettings();
    if (s.apiMode === "proxy") return PROXY_PATH;
    const direct = s.apiBaseUrl.trim().replace(/\/$/, "");
    if (direct) return direct;
  }

  const fromEnv = process.env.NEXT_PUBLIC_CHANGE_SOCIETY_API_URL?.trim();
  if (typeof window !== "undefined") {
    const {protocol, hostname} = window.location;
    const envLooksLocal = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);
    if (envLooksLocal && !isLoopbackHost(hostname)) {
      return `${protocol}//${hostname}:${DEFAULT_PORT}`;
    }
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    return `${protocol}//${hostname}:${DEFAULT_PORT}`;
  }

  return (fromEnv ?? `http://127.0.0.1:${DEFAULT_PORT}`).replace(/\/$/, "");
}
