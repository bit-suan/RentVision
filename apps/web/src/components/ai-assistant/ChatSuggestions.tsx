"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "./AssistantIcons";
import styles from "./assistant.module.css";

const SUGGESTION_KEYS = [
  "suggestion1",
  "suggestion2",
  "suggestion3",
  "suggestion4",
] as const;

interface ChatSuggestionsProps {
  onSelect: (suggestion: string) => void;
}

export default function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  const t = useTranslations("Assistant");

  return (
    <div className={styles.suggestionsBlock}>
      <p className={styles.suggestionsLabel}>{t("suggestionsLabel")}</p>
      <div className={styles.suggestions}>
        {SUGGESTION_KEYS.map((key) => {
          const suggestion = t(key);
          return (
            <button
              className={styles.suggestion}
              key={key}
              onClick={() => onSelect(suggestion)}
              type="button"
            >
              <span className={styles.suggestionText}>{suggestion}</span>
              <ArrowRightIcon className={styles.suggestionArrow} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
