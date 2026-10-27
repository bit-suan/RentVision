"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatMonthlyRent } from "@/lib/property-formatting";
import type {
  AssistantAction,
  AssistantListingCard,
  AssistantUiMessage,
} from "@/lib/assistant-contracts";
import { AlertIcon, RetryIcon } from "./AssistantIcons";
import styles from "./assistant.module.css";

interface ChatMessageProps {
  message: AssistantUiMessage;
  canRetry: boolean;
  onRetry: () => void;
}

function actionClass(variant: AssistantAction["variant"]): string {
  return variant === "primary" ? styles.actionPrimary : styles.actionSecondary;
}

function ListingCard({
  listing,
  locale,
}: {
  listing: AssistantListingCard;
  locale: "en" | "am";
}) {
  const t = useTranslations("Assistant");

  return (
    <article className={styles.listingCard}>
      <div className={styles.listingTop}>
        <Link className={styles.listingTitle} href={listing.detailHref}>
          {listing.title}
        </Link>
        {listing.isDemo ? (
          <span className={styles.demoBadge}>{t("demoBadge")}</span>
        ) : null}
      </div>

      <p className={styles.listingPrice}>
        {formatMonthlyRent(listing.price, locale, listing.currency)}
      </p>

      <p className={styles.listingMeta}>
        {t("propertyMeta", {
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
        })}
        {listing.location ? ` · ${listing.location}` : null}
      </p>

      <div className={styles.listingActions}>
        <Link className={styles.listingLink} href={listing.detailHref}>
          {t("viewListing")}
        </Link>
        <Link className={styles.leaseLink} href={listing.leaseHref}>
          {t("askLease")}
        </Link>
      </div>
    </article>
  );
}

export default function ChatMessage({
  message,
  canRetry,
  onRetry,
}: ChatMessageProps) {
  const t = useTranslations("Assistant");
  const rawLocale = useLocale();
  const locale = rawLocale === "am" ? "am" : "en";
  const isUser = message.role === "user";
  const isError = Boolean(message.error);

  if (isUser) {
    return (
      <div className={`${styles.messageRow} ${styles.userRow}`}>
        <span className={styles.srOnly}>{t("youLabel")}</span>
        <div className={`${styles.bubble} ${styles.userBubble}`}>
          <p className={styles.messageText}>{message.content}</p>
        </div>
      </div>
    );
  }

  const hasRichContent = Boolean(
    message.listings?.length || message.actions?.length
  );

  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <span aria-hidden="true" className={styles.avatar}>
        <Image
          alt=""
          className={styles.avatarLogo}
          height={20}
          src="/images/rentvision-logo.png"
          width={20}
        />
      </span>
      <span className={styles.srOnly}>{t("assistantLabel")}</span>
      <div
        className={[
          styles.bubble,
          styles.assistantBubble,
          hasRichContent ? styles.wideBubble : "",
          isError ? styles.errorBubble : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role={isError ? "alert" : undefined}
      >
        {isError ? (
          <span aria-hidden="true" className={styles.errorIcon}>
            <AlertIcon />
          </span>
        ) : null}
        <p className={styles.messageText}>{message.content}</p>

        {message.listings?.length ? (
          <div className={styles.listings}>
            {message.listings.map((listing) => (
              <ListingCard
                key={listing.listingId}
                listing={listing}
                locale={locale}
              />
            ))}
          </div>
        ) : null}

        {message.actions?.length ? (
          <div className={styles.actions}>
            {message.actions.map((action) => (
              <Link
                className={actionClass(action.variant)}
                href={action.href}
                key={`${action.href}-${action.label}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}

        {isError && message.error?.retryable && canRetry ? (
          <button className={styles.retryButton} onClick={onRetry} type="button">
            <RetryIcon className={styles.retryIcon} />
            {t("retryLabel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
