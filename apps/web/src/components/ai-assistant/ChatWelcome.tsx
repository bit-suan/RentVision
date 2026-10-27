"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import ChatSuggestions from "./ChatSuggestions";
import styles from "./assistant.module.css";

interface ChatWelcomeProps {
  onSuggestion: (suggestion: string) => void;
}

export default function ChatWelcome({ onSuggestion }: ChatWelcomeProps) {
  const t = useTranslations("Assistant");

  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeMark} aria-hidden="true">
        <Image
          alt=""
          className={styles.welcomeLogo}
          height={34}
          src="/images/rentvision-logo.png"
          width={34}
        />
      </div>
      <div className={styles.welcomeCopy}>
        <h3 className={styles.welcomeTitle}>{t("welcomeTitle")}</h3>
        <p className={styles.welcomeBody}>{t("welcomeBody")}</p>
      </div>
      <p className={styles.welcomeDisclaimer}>{t("welcomeDisclaimer")}</p>
      <ChatSuggestions onSelect={onSuggestion} />
    </div>
  );
}
