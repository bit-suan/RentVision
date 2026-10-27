import type {
  AssistantChatErrorCode,
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
} from "@/lib/assistant-contracts";

// Route handlers run on the Node.js runtime by default. Declaring `runtime`
// explicitly is rejected when `cacheComponents` is enabled in next.config.ts.

const DEFAULT_DEV_UPSTREAM =
  "http://127.0.0.1:8000/api/v1/assistant/chat";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 12000;
const MAX_BODY_BYTES = 32_000;
const MAX_REPLY_CHARS = 8000;
const DEFAULT_TIMEOUT_MS = 20_000;
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const ALLOWED_LOCALES = new Set(["en", "am"]);

function errorResponse(
  status: number,
  code: AssistantChatErrorCode,
  message: string,
  retryable = true
) {
  return Response.json(
    { error: { code, message, retryable } },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function resolveUpstreamUrl(): string | null {
  const configured = process.env.RENTVISION_AI_CHAT_URL?.trim();
  if (configured) return configured;

  // The web app loads apps/web/.env*, not the repository-root .env. Keep a
  // development-only default so local `uvicorn` works without extra setup.
  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_UPSTREAM;
  }

  return null;
}

function resolveTimeoutMs(): number {
  const parsed = Number(process.env.RENTVISION_AI_CHAT_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(60_000, Math.max(1_000, Math.round(parsed)));
}

function validatePayload(
  body: unknown
):
  | { ok: true; value: AssistantChatRequest }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const rawMessages = record.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, message: "At least one message is required." };
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return {
      ok: false,
      message: `A conversation can contain at most ${MAX_MESSAGES} messages.`,
    };
  }

  const messages: AssistantChatMessage[] = [];
  let totalChars = 0;

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== "object" || Array.isArray(rawMessage)) {
      return { ok: false, message: "Each message must be an object." };
    }

    const message = rawMessage as Record<string, unknown>;
    if (typeof message.role !== "string" || !ALLOWED_ROLES.has(message.role)) {
      return { ok: false, message: "Message roles must be user or assistant." };
    }
    if (typeof message.content !== "string") {
      return { ok: false, message: "Message content must be text." };
    }

    const content = message.content.replace(/\x00/g, "").trim();
    if (!content) {
      return { ok: false, message: "Message content must not be empty." };
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        message: `Each message must be ${MAX_MESSAGE_CHARS} characters or fewer.`,
      };
    }

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return {
        ok: false,
        message: `The conversation must be ${MAX_TOTAL_CHARS} characters or fewer.`,
      };
    }

    messages.push({
      role: message.role as AssistantChatMessage["role"],
      content,
    });
  }

  if (messages[messages.length - 1]?.role !== "user") {
    return { ok: false, message: "The last message must come from the user." };
  }

  const locale =
    typeof record.locale === "string" && ALLOWED_LOCALES.has(record.locale)
      ? (record.locale as AssistantChatRequest["locale"])
      : "en";

  return { ok: true, value: { messages, locale } };
}

async function forwardUpstream(
  upstreamUrl: string,
  request: AssistantChatRequest,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) {
      return errorResponse(
        504,
        "timeout",
        "The AI service did not respond in time. Please try again."
      );
    }

    console.error(
      "[assistant-chat] upstream request failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return errorResponse(
      503,
      "unavailable",
      "The AI service is unavailable right now. Please try again."
    );
  }

  let payload: unknown = null;
  try {
    payload = await upstream.json();
  } catch {
    payload = null;
  }

  if (signal.aborted) {
    return errorResponse(
      504,
      "timeout",
      "The AI service did not respond in time. Please try again."
    );
  }

  if (!upstream.ok) {
    console.error("[assistant-chat] upstream returned status", upstream.status);

    if (upstream.status === 400 || upstream.status === 422) {
      return errorResponse(
        400,
        "bad_request",
        "The assistant could not process that message. Try rephrasing it.",
        false
      );
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return errorResponse(
        503,
        "not_configured",
        "The AI service is not configured with valid credentials.",
        false
      );
    }
    if (upstream.status === 408 || upstream.status === 504) {
      return errorResponse(
        504,
        "timeout",
        "The AI service did not respond in time. Please try again."
      );
    }
    if (upstream.status === 429) {
      return errorResponse(
        429,
        "rate_limited",
        "The AI service is busy right now. Please wait a moment and try again."
      );
    }
    if (upstream.status === 503) {
      return errorResponse(
        503,
        "unavailable",
        "The AI service is unavailable right now. Please try again."
      );
    }

    return errorResponse(
      502,
      "upstream_error",
      "The AI service returned an error. Please try again."
    );
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse(
      502,
      "upstream_error",
      "The AI service returned an unreadable response."
    );
  }

  const data = payload as Record<string, unknown>;
  const reply = typeof data.reply === "string" ? data.reply.trim() : "";
  if (!reply) {
    return errorResponse(
      502,
      "empty_response",
      "The AI service returned an empty answer. Please try again."
    );
  }

  const response: AssistantChatResponse = {
    reply: reply.slice(0, MAX_REPLY_CHARS),
    ...(typeof data.provider === "string" ? { provider: data.provider } : {}),
    ...(typeof data.model === "string" ? { model: data.model } : {}),
  };

  return Response.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Server-side boundary for general assistant questions.
 *
 * Deterministic property, trust, and lease guidance is handled in the browser
 * using the app's own data and routes. This proxy only handles general questions
 * and keeps model-provider credentials and the private AI service URL on the
 * server. It never fabricates a response when the upstream is unavailable.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, "bad_request", "The request body is too large.", false);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(400, "bad_request", "The request body could not be read.", false);
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return errorResponse(413, "bad_request", "The request body is too large.", false);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "bad_request", "The request body must be valid JSON.", false);
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    return errorResponse(400, "bad_request", validated.message, false);
  }

  const upstreamUrl = resolveUpstreamUrl();
  if (!upstreamUrl) {
    return errorResponse(
      503,
      "not_configured",
      "The AI service is not configured on this deployment.",
      false
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const upstreamToken = process.env.RENTVISION_AI_CHAT_TOKEN?.trim();
  if (upstreamToken) {
    headers.Authorization = `Bearer ${upstreamToken}`;
  }

  try {
    return await forwardUpstream(
      upstreamUrl,
      validated.value,
      headers,
      controller.signal
    );
  } finally {
    clearTimeout(timeout);
  }
}
