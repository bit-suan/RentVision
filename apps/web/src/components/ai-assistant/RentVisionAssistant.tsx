"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/routing";
import FloatingChatButton from "./FloatingChatButton";
import RentVisionChatPanel from "./RentVisionChatPanel";
import { useRentVisionChat } from "./useRentVisionChat";
import styles from "./assistant.module.css";

const PANEL_ID = "rv-assistant-panel";

export default function RentVisionAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const chat = useRentVisionChat();

  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const isMapPage = pathname === "/map" || pathname.startsWith("/map/");

  const open = useCallback(() => {
    const activeElement =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    restoreFocusRef.current = activeElement;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [close, isOpen, open]);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        requestAnimationFrame(() => {
          const previous = restoreFocusRef.current;
          const canRestorePrevious =
            previous &&
            previous !== document.body &&
            previous !== document.documentElement &&
            document.contains(previous);
          (canRestorePrevious ? previous : launcherRef.current)?.focus();
        });
      }
      return;
    }

    wasOpenRef.current = true;
    const focusTimer = window.setTimeout(() => {
      composerRef.current?.focus();
    }, 80);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  return (
    <div
      className={`${styles.root} ${isMapPage ? styles.mapOffset : ""}`}
      data-open={isOpen ? "true" : "false"}
    >
      {isOpen ? (
        <RentVisionChatPanel
          composerRef={composerRef}
          hasMessages={chat.hasMessages}
          isSending={chat.isSending}
          messages={chat.messages}
          onClear={chat.clearConversation}
          onClose={close}
          onRetry={chat.retryLast}
          onSend={chat.sendMessage}
          panelId={PANEL_ID}
          panelRef={panelRef}
        />
      ) : null}

      <FloatingChatButton
        buttonRef={launcherRef}
        controlsId={PANEL_ID}
        isOpen={isOpen}
        onToggle={toggle}
      />
    </div>
  );
}
