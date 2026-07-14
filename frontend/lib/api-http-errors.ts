/** Parse FastAPI / Change Society JSON error envelopes for UI and logs. */

export type ParsedApiError = {
  message: string;
  code?: string;
  correlationId?: string;
  category?: string;
};

export function parseApiErrorPayload(data: unknown, status: number): ParsedApiError {
  if (data && typeof data === "object") {
    if ("error" in data) {
      const error = (data as {
        error?: {message?: string; error_code?: string; correlation_id?: string; category?: string};
      }).error;
      if (error?.message) {
        return {
          message: error.message,
          code: error.error_code,
          correlationId: error.correlation_id,
          category: error.category,
        };
      }
    }
    if ("detail" in data) {
      const detail = (data as {detail: unknown}).detail;
      if (typeof detail === "string" && detail.trim()) {
        return {message: detail.trim()};
      }
      if (Array.isArray(detail)) {
        const parts = detail.map(item => {
          if (item && typeof item === "object" && "msg" in item) return String((item as {msg: string}).msg);
          return JSON.stringify(item);
        });
        return {message: parts.join("; ")};
      }
    }
  }
  return {message: `Request failed with HTTP ${status}`};
}

export function formatNonJsonHttpError(raw: string, status: number, url: string): string {
  const trimmed = raw.trim();
  const snippet = trimmed.slice(0, 500).replace(/\s+/g, " ");
  const html = trimmed.startsWith("<") || /Internal Server Error/i.test(trimmed);
  const timeoutHint = html && status === 500 && trimmed.length < 80
    ? " Likely cause: UI proxy timed out (~30s) while the society run was still running on the API — redeploy the web app with the long-timeout proxy route."
    : "";
  const bodyPart = snippet ? ` Body: ${snippet}` : "";
  return `HTTP ${status} non-JSON from ${url}.${timeoutHint}${bodyPart}`;
}

export function formatApiErrorMessage(parsed: ParsedApiError): string {
  const parts = [parsed.message];
  if (parsed.code) parts.push(`code=${parsed.code}`);
  if (parsed.correlationId) parts.push(`correlation=${parsed.correlationId}`);
  return parts.join(" · ");
}
