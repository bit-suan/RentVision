"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import { isMockMode, listListings } from "@/lib/api";
import { AssistantChatError, requestAssistantChat } from "@/lib/assistant-chat";
import {
  buildPropertiesHref,
  classifyAssistantIntent,
  filterAvailableListings,
  listingLeaseHref,
  parsePropertySearchQuery,
  toAssistantListingCard,
} from "@/lib/assistant-intent";
import type {
  AssistantAction,
  AssistantChatMessage,
  AssistantListingCard,
  AssistantMessageError,
  AssistantUiMessage,
} from "@/lib/assistant-contracts";

const STORAGE_PREFIX = "rentvision.assistant.chat.v1";
const MAX_STORED_MESSAGES = 24;
const MAX_CONVERSATION_MESSAGES = 40;
const MAX_INPUT_LENGTH = 1000;
const MAX_AI_CONTEXT_MESSAGES = 8;
const MAX_AI_CONTEXT_CHARS = 11_000;

const SENSITIVE_CONTENT_RE =
  /-----BEGIN|%PDF-|Bearer\s+[A-Za-z0-9._~+/=-]{20,}|(?:password|passcode|secret)\s*[:=]/i;

function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error("aborted"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new Error("aborted"));
    };

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}

function isSafeInternalHref(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    value.length <= 500
  );
}

function isStoredAction(value: unknown): value is AssistantAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  return (
    typeof action.label === "string" &&
    action.label.length > 0 &&
    action.label.length <= 120 &&
    isSafeInternalHref(action.href) &&
    (action.variant === undefined ||
      action.variant === "primary" ||
      action.variant === "secondary")
  );
}

function isStoredListing(value: unknown): value is AssistantListingCard {
  if (!value || typeof value !== "object") return false;
  const listing = value as Record<string, unknown>;
  return (
    typeof listing.listingId === "string" &&
    listing.listingId.length > 0 &&
    listing.listingId.length <= 200 &&
    typeof listing.title === "string" &&
    listing.title.length > 0 &&
    listing.title.length <= 300 &&
    typeof listing.price === "number" &&
    Number.isFinite(listing.price) &&
    typeof listing.currency === "string" &&
    typeof listing.bedrooms === "number" &&
    typeof listing.bathrooms === "number" &&
    typeof listing.location === "string" &&
    typeof listing.propertyType === "string" &&
    isSafeInternalHref(listing.detailHref) &&
    isSafeInternalHref(listing.leaseHref) &&
    typeof listing.isDemo === "boolean"
  );
}

function isStoredError(value: unknown): value is AssistantMessageError {
  if (!value || typeof value !== "object") return false;
  const error = value as Record<string, unknown>;
  return (
    typeof error.code === "string" &&
    error.code.length > 0 &&
    error.code.length <= 80 &&
    typeof error.message === "string" &&
    error.message.length > 0 &&
    error.message.length <= 1000 &&
    typeof error.retryable === "boolean"
  );
}

function isStoredMessage(value: unknown): value is AssistantUiMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;

  if (
    typeof message.id !== "string" ||
    message.id.length === 0 ||
    message.id.length > 120 ||
    (message.role !== "user" && message.role !== "assistant") ||
    typeof message.content !== "string" ||
    message.content.length === 0 ||
    message.content.length > 4000 ||
    typeof message.createdAt !== "number" ||
    !Number.isFinite(message.createdAt)
  ) {
    return false;
  }

  if (
    message.source !== undefined &&
    message.source !== "platform" &&
    message.source !== "ai"
  ) {
    return false;
  }

  if (message.listings !== undefined) {
    if (
      !Array.isArray(message.listings) ||
      message.listings.length > 3 ||
      !message.listings.every(isStoredListing)
    ) {
      return false;
    }
  }

  if (message.actions !== undefined) {
    if (
      !Array.isArray(message.actions) ||
      message.actions.length > 3 ||
      !message.actions.every(isStoredAction)
    ) {
      return false;
    }
  }

  if (message.error !== undefined && !isStoredError(message.error)) {
    return false;
  }

  return true;
}

function storageKeyForScope(scope: string): string {
  return `${STORAGE_PREFIX}:${scope}`;
}

function clearOtherAssistantScopes(currentKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(`${STORAGE_PREFIX}:`) && key !== currentKey) {
        keys.push(key);
      }
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy mode. Chat still works in memory.
  }
}

function loadStoredMessages(key: string): AssistantUiMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredMessage)
      .slice(-MAX_STORED_MESSAGES)
      .map((message) => ({
        ...message,
        listings: message.listings?.slice(0, 3),
        actions: message.actions?.slice(0, 3),
      }));
  } catch {
    return [];
  }
}

function shouldPersistMessages(messages: AssistantUiMessage[]): boolean {
  if (messages.length === 0) return false;
  if (messages.length > MAX_STORED_MESSAGES) return false;

  return messages.every((message) => {
    if (message.content.length > 1200) return false;
    if (SENSITIVE_CONTENT_RE.test(message.content)) return false;
    return true;
  });
}

function saveStoredMessages(key: string, messages: AssistantUiMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    if (!shouldPersistMessages(messages)) {
      sessionStorage.removeItem(key);
      return;
    }

    const safeMessages = messages.map((message) => ({
      ...message,
      listings: message.listings?.slice(0, 3),
      actions: message.actions?.slice(0, 3),
    }));
    sessionStorage.setItem(key, JSON.stringify(safeMessages));
  } catch {
    // Never let storage failures break the chat.
  }
}

function removeStoredMessages(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function makeErrorMessage(error: AssistantMessageError): AssistantUiMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content: error.message,
    createdAt: Date.now(),
    source: "platform",
    error,
  };
}

function makeAssistantMessage(
  content: string,
  options: {
    source: AssistantUiMessage["source"];
    listings?: AssistantListingCard[];
    actions?: AssistantAction[];
  }
): AssistantUiMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content,
    createdAt: Date.now(),
    source: options.source,
    ...(options.listings?.length ? { listings: options.listings } : {}),
    ...(options.actions?.length ? { actions: options.actions } : {}),
  };
}

export function useRentVisionChat() {
  const t = useTranslations("Assistant");
  const rawLocale = useLocale();
  const locale = rawLocale === "am" ? "am" : "en";
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);

  const messagesRef = useRef<AssistantUiMessage[]>([]);
  const sendingRef = useRef(false);
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const scope = useMemo(() => {
    if (isAuthLoading) return null;
    if (user?.userId) return `user:${encodeURIComponent(user.userId)}`;
    return "guest";
  }, [isAuthLoading, user?.userId]);

  const storageKey = useMemo(
    () => (scope ? storageKeyForScope(scope) : null),
    [scope]
  );

  const currentProperty = useMemo(() => {
    const match = pathname.match(
      /^\/(properties|listings)\/([^/?#]+)(?:\/|$)/
    );
    if (!match) return null;
    try {
      return {
        id: decodeURIComponent(match[2]),
        isDemo: match[1] === "properties",
      };
    } catch {
      return null;
    }
  }, [pathname]);

  const commitMessages = useCallback(
    (updater: (previous: AssistantUiMessage[]) => AssistantUiMessage[]) => {
      const next = updater(messagesRef.current);
      messagesRef.current = next;
      setMessages(next);
    },
    []
  );

  useEffect(() => {
    if (!storageKey) return;

    requestSeqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setIsSending(false);

    clearOtherAssistantScopes(storageKey);
    const stored = loadStoredMessages(storageKey);
    messagesRef.current = stored;
    setMessages(stored);
    setLoadedStorageKey(storageKey);
    setIsHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated || !storageKey || loadedStorageKey !== storageKey) {
      return;
    }
    saveStoredMessages(storageKey, messages);
  }, [isHydrated, loadedStorageKey, messages, storageKey]);

  useEffect(() => {
    return () => {
      requestSeqRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  const toErrorMessage = useCallback(
    (error: unknown): AssistantMessageError => {
      if (error instanceof AssistantChatError) {
        switch (error.code) {
          case "not_configured":
            return {
              code: error.code,
              message: t("aiErrorAuth"),
              retryable: false,
            };
          case "timeout":
            return {
              code: error.code,
              message: t("aiErrorTimeout"),
              retryable: true,
            };
          case "rate_limited":
            return {
              code: error.code,
              message: t("aiErrorRateLimit"),
              retryable: true,
            };
          case "bad_request":
            return {
              code: error.code,
              message: t("aiErrorBadRequest"),
              retryable: false,
            };
          case "empty_response":
            return {
              code: error.code,
              message: t("aiErrorEmpty"),
              retryable: true,
            };
          case "network_error":
            return {
              code: error.code,
              message: t("aiErrorNetwork"),
              retryable: true,
            };
          case "unavailable":
            return {
              code: error.code,
              message: t("aiErrorUpstream"),
              retryable: true,
            };
          default:
            return {
              code: error.code,
              message: t("aiErrorProvider"),
              retryable: error.retryable,
            };
        }
      }

      return {
        code: "network_error",
        message: t("errorNetwork"),
        retryable: true,
      };
    },
    [t]
  );

  const respond = useCallback(
    async (userText: string, contextMessages: AssistantUiMessage[]) => {
      const sequence = requestSeqRef.current + 1;
      requestSeqRef.current = sequence;
      sendingRef.current = true;
      setIsSending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const intent = classifyAssistantIntent(userText);
        let reply: AssistantUiMessage;

        if (intent === "property_search") {
          const query = parsePropertySearchQuery(userText);
          const hasFilters = Object.keys(query).length > 0;
          const isDemo = isMockMode();

          try {
            const [result] = await Promise.all([
              withTimeout(listListings(), 12_000, controller.signal),
              wait(300, controller.signal),
            ]);
            const matches = filterAvailableListings(result.items, query).slice(0, 3);

            const intro =
              matches.length === 0
                ? t("searchNone")
                : hasFilters
                  ? t("searchIntro", { count: matches.length })
                  : t("searchIntroNoFilters");

            const content = [
              intro,
              matches.length === 0 ? t("searchNoneHint") : null,
              isDemo ? t("searchDemoNote") : null,
            ]
              .filter(Boolean)
              .join("\n\n");

            const actions: AssistantAction[] = [
              matches.length === 0
                ? {
                    label: t("searchWidenAction"),
                    href: "/properties",
                    variant: "secondary",
                  }
                : {
                    label: hasFilters
                      ? t("searchResultsAction")
                      : t("searchBrowseAction"),
                    href: hasFilters
                      ? buildPropertiesHref(query)
                      : "/properties",
                    variant: "secondary",
                  },
            ];

            reply = makeAssistantMessage(content, {
              source: "platform",
              listings: matches.map((listing) =>
                toAssistantListingCard(listing, isDemo)
              ),
              actions,
            });
          } catch {
            if (controller.signal.aborted) return;
            reply = makeErrorMessage({
              code: "property_unavailable",
              message: t("errorGeneric"),
              retryable: true,
            });
          }
        } else if (intent === "lease") {
          await wait(250, controller.signal);
          const actions: AssistantAction[] = [];

          if (currentProperty) {
            actions.push({
              label: t("leaseCurrentAction"),
              href: listingLeaseHref(currentProperty.id, currentProperty.isDemo),
              variant: "primary",
            });
          }
          actions.push({
            label: t("leaseBrowseAction"),
            href: "/properties",
            variant: currentProperty ? "secondary" : "primary",
          });

          reply = makeAssistantMessage(
            [
              t("leaseIntro"),
              t("leaseSteps"),
              currentProperty ? null : t("leaseNoCurrent"),
            ]
              .filter(Boolean)
              .join("\n\n"),
            { source: "platform", actions }
          );
        } else if (intent === "trust") {
          await wait(250, controller.signal);
          reply = makeAssistantMessage(
            [t("trustIntro"), t("trustNoClaims")].join("\n\n"),
            {
              source: "platform",
              actions: [
                {
                  label: t("trustAction"),
                  href: "/#trust-safety",
                  variant: "primary",
                },
                {
                  label: t("trustBrowse"),
                  href: "/properties",
                  variant: "secondary",
                },
              ],
            }
          );
        } else if (intent === "platform_help") {
          await wait(250, controller.signal);
          reply = makeAssistantMessage(
            [
              t("helpTitle"),
              `• ${t("helpSearch")}`,
              `• ${t("helpTrust")}`,
              `• ${t("helpLease")}`,
              `• ${t("helpGeneral")}`,
              "",
              t("helpNote"),
            ].join("\n"),
            {
              source: "platform",
              actions: [
                {
                  label: t("searchBrowseAction"),
                  href: "/properties",
                  variant: "primary",
                },
              ],
            }
          );
        } else if (intent === "greeting") {
          await wait(200, controller.signal);
          reply = makeAssistantMessage(
            contextMessages.length > 1 ? t("greetingAfter") : t("greeting"),
            { source: "platform" }
          );
        } else {
          const aiMessages: AssistantChatMessage[] = [];
          let totalChars = 0;

          for (const message of contextMessages.slice(-MAX_AI_CONTEXT_MESSAGES)) {
            if (message.error) continue;
            const content = message.content.trim();
            if (!content) continue;
            if (totalChars + content.length > MAX_AI_CONTEXT_CHARS) break;

            aiMessages.push({
              role: message.role,
              content: content.slice(0, 4000),
            });
            totalChars += content.length;
          }

          const response = await requestAssistantChat(
            aiMessages,
            locale,
            controller.signal
          );

          reply = makeAssistantMessage(response.reply, { source: "ai" });
        }

        if (controller.signal.aborted || requestSeqRef.current !== sequence) {
          return;
        }

        commitMessages((previous) => [...previous, reply]);
      } catch (error) {
        if (controller.signal.aborted || requestSeqRef.current !== sequence) {
          return;
        }
        commitMessages((previous) => [
          ...previous,
          makeErrorMessage(toErrorMessage(error)),
        ]);
      } finally {
        if (requestSeqRef.current === sequence) {
          sendingRef.current = false;
          setIsSending(false);
          abortRef.current = null;
        }
      }
    },
    [commitMessages, currentProperty, locale, t, toErrorMessage]
  );

  const sendMessage = useCallback(
    (rawText: string) => {
      const text = rawText.replace(/\x00/g, "").trim().slice(0, MAX_INPUT_LENGTH);
      if (!text || sendingRef.current) return;

      if (messagesRef.current.length >= MAX_CONVERSATION_MESSAGES) {
        if (
          messagesRef.current.some(
            (message) => message.error?.code === "conversation_limit"
          )
        ) {
          return;
        }

        commitMessages((previous) => [
          ...previous,
          makeErrorMessage({
            code: "conversation_limit",
            message: t("messageLimit"),
            retryable: false,
          }),
        ]);
        return;
      }

      const userMessage: AssistantUiMessage = {
        id: createMessageId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      const next = [...messagesRef.current, userMessage];
      commitMessages(() => next);
      void respond(text, next);
    },
    [commitMessages, respond, t]
  );

  const retryLast = useCallback(() => {
    if (sendingRef.current) return;

    const current = messagesRef.current;
    let lastUserIndex = -1;
    for (let index = current.length - 1; index >= 0; index -= 1) {
      if (current[index].role === "user") {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex < 0) return;

    const truncated = current.slice(0, lastUserIndex + 1);
    commitMessages(() => truncated);
    void respond(truncated[lastUserIndex].content, truncated);
  }, [commitMessages, respond]);

  const clearConversation = useCallback(() => {
    requestSeqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setIsSending(false);
    commitMessages(() => []);

    if (storageKey) removeStoredMessages(storageKey);
  }, [commitMessages, storageKey]);

  return {
    messages,
    isSending,
    isHydrated,
    hasMessages: messages.length > 0,
    sendMessage,
    retryLast,
    clearConversation,
  };
}
