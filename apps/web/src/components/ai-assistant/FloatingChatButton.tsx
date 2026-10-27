"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { CloseIcon, SparkleChatIcon } from "./AssistantIcons";
import styles from "./assistant.module.css";

interface FloatingChatButtonProps {
  buttonRef: RefObject<HTMLButtonElement | null>;
  controlsId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FloatingChatButton({
  buttonRef,
  controlsId,
  isOpen,
  onToggle,
}: FloatingChatButtonProps) {
  const t = useTranslations("Assistant");

  return (
    <button
      aria-controls={controlsId}
      aria-expanded={isOpen}
      aria-label={isOpen ? t("launcherClose") : t("launcherOpen")}
      className={styles.launcher}
      onClick={onToggle}
      ref={buttonRef}
      type="button"
    >
      <span aria-hidden="true" className={styles.launcherIcon}>
        {isOpen ? (
          <CloseIcon className={styles.launcherGlyph} />
        ) : (
          <SparkleChatIcon className={styles.launcherGlyph} />
        )}
      </span>
      <span className={styles.launcherLabel}>{t("launcherLabel")}</span>
      <span aria-hidden="true" className={styles.launcherShine} />
    </button>
  );
}
