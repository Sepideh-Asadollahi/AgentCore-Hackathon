import {loadClientSettings, type ClientSettings} from "@/lib/client-settings";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {debug: 10, info: 20, warn: 30, error: 40};

let loggingEnabled = false;
let minLevel: LogLevel = "debug";

function defaultLoggingEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "false") return false;
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG_LOG === "true") return true;
  return process.env.NODE_ENV === "development";
}

function resolveLoggingEnabled(settings?: ClientSettings): boolean {
  if (process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG === "1") return true;
  const s = settings ?? (typeof window !== "undefined" ? loadClientSettings() : undefined);
  return s?.debugLogging ?? defaultLoggingEnabled();
}

/** Apply browser settings + env defaults (call on client mount and after settings save). */
export function configureAppLogging(settings?: ClientSettings): void {
  loggingEnabled = resolveLoggingEnabled(settings);
  minLevel = "debug";
}

export function isAppLoggingEnabled(): boolean {
  return loggingEnabled || process.env.NEXT_PUBLIC_CHANGE_SOCIETY_DEBUG === "1";
}

export type AppLogger = {
  debug: (message: string, detail?: Record<string, unknown>) => void;
  info: (message: string, detail?: Record<string, unknown>) => void;
  warn: (message: string, detail?: Record<string, unknown>) => void;
  error: (message: string, detail?: Record<string, unknown>) => void;
};

function shouldEmit(level: LogLevel): boolean {
  if (level === "error") return true;
  if (!isAppLoggingEnabled()) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function emit(scope: string, level: LogLevel, message: string, detail?: Record<string, unknown>): void {
  if (!shouldEmit(level)) return;
  const tag = `[ChangeSociety:${scope}]`;
  const payload = detail && Object.keys(detail).length > 0 ? detail : undefined;
  if (level === "debug") console.debug(tag, message, payload ?? "");
  else if (level === "info") console.info(tag, message, payload ?? "");
  else if (level === "warn") console.warn(tag, message, payload ?? "");
  else console.error(tag, message, payload ?? "");
}

export function createLogger(scope: string): AppLogger {
  return {
    debug: (message, detail) => emit(scope, "debug", message, detail),
    info: (message, detail) => emit(scope, "info", message, detail),
    warn: (message, detail) => emit(scope, "warn", message, detail),
    error: (message, detail) => emit(scope, "error", message, detail),
  };
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  configureAppLogging();
}
