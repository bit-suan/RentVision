"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { SendIcon } from "./AssistantIcons";
import styles from "./assistant.module.css";

const MAX_INPUT_LENGTH = 1000;
const MAX_TEXTAREA_HEIGHT = 120;

interface ChatComposerProps {
  isSending: boolean;
  onSend: (message: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export default function ChatComposer({
  isSending,
  onSend,
  textareaRef,
}: ChatComposerProps) {
  const t = useTranslations("Assistant");
  const [value, setValue] = useState("");
  const hintId = useId();
  const canSend = value.trim().length > 0 && !isSending;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      MAX_TEXTAREA_HEIGHT
    )}px`;
  }, [textareaRef, value]);

  const submit = () => {
    const message = value.trim();
    if (!message || isSending) return;

    onSend(message);
    setValue("");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  return (
    <div className={styles.composer}>
      <form
        aria-busy={isSending}
        className={styles.composerForm}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className={styles.srOnly} htmlFor="rv-assistant-input">
          {t("composerLabel")}
        </label>
        <textarea
          aria-describedby={hintId}
          autoComplete="off"
          className={styles.textarea}
          enterKeyHint="send"
          id="rv-assistant-input"
          maxLength={MAX_INPUT_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("composerPlaceholder")}
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <button
          aria-label={t("sendLabel")}
          className={styles.sendButton}
          disabled={!canSend}
          title={t("sendLabel")}
          type="submit"
        >
          {isSending ? (
            <span aria-hidden="true" className={styles.spinner} />
          ) : (
            <SendIcon className={styles.sendIcon} />
          )}
        </button>
      </form>

      <div className={styles.composerMeta}>
        <p className={styles.composerHint} id={hintId}>
          {t("composerHint")}
        </p>
        {value.length > 800 ? (
          <span className={styles.characterCount}>
            {value.length}/{MAX_INPUT_LENGTH}
          </span>
        ) : null}
      </div>
    </div>
  );
}
