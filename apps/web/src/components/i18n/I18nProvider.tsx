"use client";

import { NextIntlClientProvider } from "next-intl";
import { createGetMessageFallback, createOnError } from "@/i18n/fallback";
import type { ReactNode } from "react";

interface I18nProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  fallbackMessages?: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Client-side internationalization provider.
 * Runs on the client to safely provide onError and getMessageFallback
 * handlers without crossing the React Server Component serialization boundary.
 */
export default function I18nProvider({
  locale,
  messages,
  fallbackMessages,
  children,
}: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={createOnError(locale)}
      getMessageFallback={createGetMessageFallback(locale, fallbackMessages)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
