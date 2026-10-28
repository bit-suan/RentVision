import type { NextRequest } from "next/server";

/**
 * Same-origin gateway for the RentVision API.
 *
 * The browser always calls `/api/v1/*`; this Route Handler forwards the request
 * to the API service using Render's private service host (`API_INTERNAL_URL`).
 * Keeping the browser on one origin avoids CORS configuration drift and lets
 * `NEXT_PUBLIC_API_BASE_URL` stay a stable relative path.
 *
 * The handler runs at request time, so the API host does not need to be known
 * when the web app is built.
 */

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

// Identity headers are only ever minted/verified by the API. Drop anything the
// browser tries to inject and forward the signed bearer token instead.
const CLIENT_IDENTITY_HEADERS = new Set(["x-user-id", "x-user-role"]);

const UPSTREAM_TIMEOUT_MS = 60_000;

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function resolveApiBaseUrl(): string | null {
  const configured = process.env.API_INTERNAL_URL?.trim();
  if (!configured) return null;

  const withScheme = /^https?:\/\//i.test(configured)
    ? configured
    : `http://${configured}`;

  return withScheme.replace(/\/+$/, "");
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return jsonError(
      503,
      "API_NOT_CONFIGURED",
      "The RentVision API service is not configured on this deployment."
    );
  }

  const { path } = await context.params;
  if (!path?.length || path.some((segment) => segment === "." || segment === "..")) {
    return jsonError(400, "INVALID_PATH", "The requested API path is invalid.");
  }

  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(`${apiBaseUrl}/api/v1/${encodedPath}`);
  target.search = request.nextUrl.search;

  const method = request.method.toUpperCase();
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  for (const header of CLIENT_IDENTITY_HEADERS) {
    headers.delete(header);
  }

  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return jsonError(
        504,
        "UPSTREAM_TIMEOUT",
        "The RentVision API did not respond in time. Please try again."
      );
    }

    console.error(
      "[api-gateway] upstream request failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return jsonError(
      503,
      "API_UNAVAILABLE",
      "The RentVision API is unavailable right now. Please try again."
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header);
  }
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("Cache-Control", "no-store");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
  proxyRequest as OPTIONS,
  proxyRequest as HEAD,
};
