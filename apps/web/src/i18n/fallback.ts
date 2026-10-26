/**
 * RentVision i18n Missing Message and Fallback Strategy
 *
 * Policy:
 * 1. Default Locale: English ('en').
 * 2. In Development: Missing messages are explicitly highlighted (e.g. `[Missing translation: Namespace.key]`)
 *    and logged with detailed context so engineers immediately notice them during development.
 * 3. In Production: Non-English locales (e.g. 'am') gracefully fall back to the default English
 *    catalog message when available, preventing unsightly technical placeholders from leaking to users.
 *    Any missing message is simultaneously logged so it is visible in application telemetry.
 * 4. Validation Isolation: Automated catalog validation (scripts/validate-catalogs.mjs) evaluates raw JSON
 *    directly from disk and NEVER uses runtime fallbacks, ensuring genuine translation omissions cannot
 *    be masked during CI / build.
 */

export interface FallbackInfo {
  error: {
    code: string;
    message: string;
    originalMessage?: string;
  };
  key: string;
  namespace?: string;
}

/**
 * Resolves a dot-delimited path (e.g. "Landing.features.discover.title") in a nested object.
 */
export function resolveNestedKey(
  obj: Record<string, unknown> | undefined,
  path: string
): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Creates an onError handler for next-intl request and client providers.
 */
export function createOnError(locale: string) {
  return function onError(error: { code: string; message: string }) {
    if (error.code === "MISSING_MESSAGE") {
      console.error(
        `[i18n:missing-message] Missing translation in locale "${locale}": ${error.message}`
      );
    } else if (error.code !== "ENVIRONMENT_FALLBACK") {
      console.error(`[i18n:error] [locale: "${locale}"] ${error.message}`);
    }
  };
}

/**
 * Creates a getMessageFallback handler for next-intl request and client providers.
 */
export function createGetMessageFallback(
  locale: string,
  fallbackMessages?: Record<string, unknown>
) {
  return function getMessageFallback(info: FallbackInfo): string {
    const fullKey = info.namespace ? `${info.namespace}.${info.key}` : info.key;

    // 1. In development, make missing translations immediately obvious in UI
    if (process.env.NODE_ENV !== "production") {
      return `[Missing translation: ${fullKey}]`;
    }

    // 2. In production, fall back to default English catalog message if available,
    // but log conspicuously to telemetry so missing translations are NEVER silent.
    if (locale !== "en" && fallbackMessages) {
      const fallback = resolveNestedKey(fallbackMessages, fullKey);
      if (typeof fallback === "string" && fallback.length > 0) {
        console.error(
          `[i18n:untranslated] Untranslated UI string detected in locale "${locale}" for key "${fullKey}". English fallback applied.`
        );
        return fallback;
      }
    }

    // 3. Last-resort fallback to the simple leaf key name
    return info.key;
  };
}
