import type {
  AssistantChatErrorBody,
  AssistantChatErrorCode,
  AssistantChatMessage,
  AssistantChatResponse,
} from "./assistant-contracts";

const CHAT_ENDPOINT = "/api/ai/chat";
const REQUEST_TIMEOUT_MS = 25_000;

const ERROR_CODES: AssistantChatErrorCode[] = [
  "bad_request",
  "not_configured",
  "timeout",
  "rate_limited",
  "upstream_error",
  "unavailable",
  "empty_response",
  "network_error",
];

function isErrorCode(value: unknown): value is AssistantChatErrorCode {
  return (
    typeof value === "string" &&
    (ERROR_CODES as string[]).includes(value)
  );
}

export class AssistantChatError extends Error {
  readonly code: AssistantChatErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: AssistantChatErrorCode,
    message: string,
    retryable = true,
    status?: number
  ) {
    super(message);
    this.name = "AssistantChatError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

function codeForStatus(status: number): AssistantChatErrorCode {
  if (status === 400 || status === 422) return "bad_request";
  if (status === 401 || status === 403) return "not_configured";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  return "upstream_error";
}

function retryableFor(code: AssistantChatErrorCode): boolean {
  return code !== "bad_request";
}

/**
 * Calls the server-side assistant proxy. Provider keys and the private AI
 * service URL never reach the browser; this client only knows this route.
 */
export async function requestAssistantChat(
  messages: AssistantChatMessage[],
  locale: "en" | "am",
  signal?: AbortSignal
): Promise<AssistantChatResponse> {
  const controller = new AbortController();
  let timedOut = false;

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, locale }),
      signal: controller.signal,
      cache: "no-store",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const body = payload as Partial<AssistantChatErrorBody> | null;
      const serverCode = body?.error?.code;
      const code = isErrorCode(serverCode)
        ? serverCode
        : codeForStatus(response.status);
      const message =
        typeof body?.error?.message === "string" && body.error.message.trim()
          ? body.error.message
          : "The assistant request failed.";
      throw new AssistantChatError(
        code,
        message,
        body?.error?.retryable ?? retryableFor(code),
        response.status
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new AssistantChatError(
        "upstream_error",
        "The assistant returned an unreadable response."
      );
    }

    const data = payload as Record<string, unknown>;
    const reply = typeof data.reply === "string" ? data.reply.trim() : "";
    if (!reply) {
      throw new AssistantChatError(
        "empty_response",
        "The assistant returned an empty answer."
      );
    }

    return {
      reply,
      ...(typeof data.provider === "string" ? { provider: data.provider } : {}),
      ...(typeof data.model === "string" ? { model: data.model } : {}),
    };
  } catch (error) {
    if (error instanceof AssistantChatError) throw error;

    if (timedOut) {
      throw new AssistantChatError(
        "timeout",
        "The assistant request timed out."
      );
    }

    if (controller.signal.aborted) {
      throw new AssistantChatError(
        "network_error",
        "The assistant request was cancelled.",
        false
      );
    }

    throw new AssistantChatError(
      "network_error",
      "The assistant service could not be reached."
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
