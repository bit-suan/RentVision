"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { AssistantUiMessage } from "@/lib/assistant-contracts";
import ChatMessage from "./ChatMessage";
import ChatWelcome from "./ChatWelcome";
import styles from "./assistant.module.css";

const NEAR_BOTTOM_PX = 72;

interface ChatMessagesProps {
  messages: AssistantUiMessage[];
  isSending: boolean;
  onSuggestion: (suggestion: string) => void;
  onRetry: () => void;
}

function scrollToBottom(node: HTMLElement, smooth: boolean) {
  node.scrollTo({
    top: node.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

export default function ChatMessages({
  messages,
  isSending,
  onSuggestion,
  onRetry,
}: ChatMessagesProps) {
  const t = useTranslations("Assistant");
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const lastMessage = messages[messages.length - 1];
    if (!nearBottomRef.current && lastMessage?.role !== "user") return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollToBottom(node, !reducedMotion);
  }, [isSending, messages]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    nearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
  };

  return (
    <div
      aria-label={t("conversationLabel")}
      aria-live="polite"
      aria-relevant="additions"
      className={styles.messages}
      onScroll={handleScroll}
      ref={scrollRef}
      role="log"
      tabIndex={0}
    >
      {messages.length === 0 ? (
        <ChatWelcome onSuggestion={onSuggestion} />
      ) : (
        messages.map((message, index) => (
          <ChatMessage
            canRetry={index === messages.length - 1}
            key={message.id}
            message={message}
            onRetry={onRetry}
          />
        ))
      )}

      {isSending ? (
        <div
          aria-label={t("typingLabel")}
          className={`${styles.messageRow} ${styles.assistantRow}`}
          role="status"
        >
          <span aria-hidden="true" className={styles.avatar}>
            <span className={styles.typingAvatarDot} />
          </span>
          <div
            className={`${styles.bubble} ${styles.assistantBubble} ${styles.typingBubble}`}
          >
            <span aria-hidden="true" className={styles.typingDots}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
            <span className={styles.srOnly}>{t("typingLabel")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
