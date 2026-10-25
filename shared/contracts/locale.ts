// Shared locale and internationalization contracts across RentVision

export type SupportedLocale = 'en' | 'am';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'am'] as const;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export interface LocaleNegotiationOptions {
  explicitLocale?: SupportedLocale | string | null;
  acceptLanguageHeader?: string | null;
  savedPreference?: SupportedLocale | string | null;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value.toLowerCase().trim());
}

/**
 * Resolves the target locale following the strict precedence:
 * 1. Explicit request payload/param locale (highest priority)
 * 2. Saved user preference (e.g. user profile / settings)
 * 3. Accept-Language HTTP header
 * 4. Default fallback: 'en'
 */
export function resolveLocale(options?: LocaleNegotiationOptions): SupportedLocale {
  if (!options) {
    return DEFAULT_LOCALE;
  }

  // 1. Explicit locale
  if (options.explicitLocale && isSupportedLocale(options.explicitLocale)) {
    return options.explicitLocale.toLowerCase().trim() as SupportedLocale;
  }

  // 2. Saved user preference
  if (options.savedPreference && isSupportedLocale(options.savedPreference)) {
    return options.savedPreference.toLowerCase().trim() as SupportedLocale;
  }

  // 3. Accept-Language HTTP header parsing
  if (options.acceptLanguageHeader) {
    const rawHeader = options.acceptLanguageHeader.toLowerCase();
    // Parse commas and quality values (e.g. "am,en-US;q=0.9,en;q=0.8")
    const candidates = rawHeader
      .split(',')
      .map(part => part.split(';')[0].trim());

    for (const cand of candidates) {
      if (cand === 'am' || cand.startsWith('am-')) {
        return 'am';
      }
      if (cand === 'en' || cand.startsWith('en-')) {
        return 'en';
      }
    }
  }

  // 4. Default fallback
  return DEFAULT_LOCALE;
}
