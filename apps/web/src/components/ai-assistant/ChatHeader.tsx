"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { CloseIcon, TrashIcon } from "./AssistantIcons";
import styles from "./assistant.module.css";

interface ChatHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
  onClose: () => void;
}

export default function ChatHeader({
  hasMessages,
  onClear,
  onClose,
}: ChatHeaderProps) {
  const t = useTranslations("Assistant");

  return (
    <header className={styles.header}>
      <span aria-hidden="true" className={styles.headerMark}>
        <Image
          alt=""
          className={styles.headerLogo}
          height={30}
          priority
          src="/images/rentvision-logo.png"
          width={30}
        />
      </span>

      <div className={styles.headerCopy}>
        <h2 className={styles.headerTitle} id="rv-assistant-title">
          {t("panelTitle")}
        </h2>
        <p className={styles.headerSubtitle} id="rv-assistant-subtitle">
          {t("panelSubtitle")}
        </p>
      </div>

      <div className={styles.headerActions}>
        {hasMessages ? (
          <button
            aria-label={t("clearLabel")}
            className={styles.headerButton}
            onClick={onClear}
            title={t("clearLabel")}
            type="button"
          >
            <TrashIcon className={styles.headerIcon} />
          </button>
        ) : null}
        <button
          aria-label={t("closeLabel")}
          className={styles.headerButton}
          onClick={onClose}
          title={t("closeLabel")}
          type="button"
        >
          <CloseIcon className={styles.headerIcon} />
        </button>
      </div>
    </header>
  );
}
