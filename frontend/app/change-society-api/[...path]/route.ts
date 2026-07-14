import {NextRequest, NextResponse} from "next/server";

const API_TARGET = (process.env.CHANGE_SOCIETY_PROXY_TARGET ?? "http://127.0.0.1:32500").replace(/\/$/, "");

/** Route segment budget (seconds). Must be a static literal for Next.js. */
export const maxDuration = 900;

function proxyTimeoutMs(): number {
  const raw = process.env.CHANGE_SOCIETY_PROXY_TIMEOUT_MS?.trim();
  const fallback = 900_000;
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) return fallback;
  return parsed;
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function buildUpstreamUrl(pathSegments: string[], search: string): string {
  const path = pathSegments.join("/");
  return `${API_TARGET}/${path}${search}`;
}

async function proxyRequest(request: NextRequest, context: {params: Promise<{path: string[]}>}): Promise<NextResponse> {
  const {path} = await context.params;
  const url = buildUpstreamUrl(path, request.nextUrl.search);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(proxyTimeoutMs() - 5_000),
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {status: upstream.status, headers: responseHeaders});
}

export async function GET(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  return proxyRequest(request, context);
}
