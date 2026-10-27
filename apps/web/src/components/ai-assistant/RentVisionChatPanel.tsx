"use client";

import type { RefObject } from "react";
import type { AssistantUiMessage } from "@/lib/assistant-contracts";
import ChatComposer from "./ChatComposer";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import styles from "./assistant.module.css";

interface RentVisionChatPanelProps {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  hasMessages: boolean;
  isSending: boolean;
  messages: AssistantUiMessage[];
  onClear: () => void;
  onClose: () => void;
  onRetry: () => void;
  onSend: (message: string) => void;
  panelId: string;
  panelRef: RefObject<HTMLElement | null>;
}

export default function RentVisionChatPanel({
  composerRef,
  hasMessages,
  isSending,
  messages,
  onClear,
  onClose,
  onRetry,
  onSend,
  panelId,
  panelRef,
}: RentVisionChatPanelProps) {
  return (
    <section
      aria-describedby="rv-assistant-subtitle"
      aria-labelledby="rv-assistant-title"
      aria-modal="false"
      className={styles.panel}
      id={panelId}
      ref={panelRef}
      role="dialog"
    >
      <ChatHeader
        hasMessages={hasMessages}
        onClear={onClear}
        onClose={onClose}
      />
      <ChatMessages
        isSending={isSending}
        messages={messages}
        onRetry={onRetry}
        onSuggestion={onSend}
      />
      <ChatComposer
        isSending={isSending}
        onSend={onSend}
        textareaRef={composerRef}
      />
    </section>
  );
}
