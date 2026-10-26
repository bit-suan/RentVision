# RentVision Localization Guide

This guide establishes conventions, architecture, and validation requirements for English (`en`) and Amharic (`am`) internationalization across the RentVision web application (`apps/web`).

---

## 1. Supported Locales and Default Locale

RentVision supports two official locales defined in `@shared/contracts/locale.ts` and `apps/web/src/i18n/routing.ts`:

| Locale Tag | Language | Direction | Font Family Stack | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `en` | English | LTR | System Sans / Inter | **Default & Canonical Source Locale** |
| `am` | Amharic (አማርኛ) | LTR | Nyala, Abyssinica SIL, Kefa, WashRa, sans-serif | Ethiopian localization with native Ethiopic numerals & typography |

The routing configuration in [`apps/web/src/i18n/routing.ts`](file:///c:/Users/hp/Desktop/rentVision/apps/web/src/i18n/routing.ts) enforces:
- `defaultLocale: "en"`
- `localePrefix: "always"` (all user-facing routes are explicitly prefixed with `/en` or `/am`).

Root navigation at `/` automatically redirects to `/${defaultLocale}`.

---

## 2. Catalog Storage and Structure

Translation catalogs reside in:
- [`apps/web/messages/en.json`](file:///c:/Users/hp/Desktop/rentVision/apps/web/messages/en.json) (English canonical source)
- [`apps/web/messages/am.json`](file:///c:/Users/hp/Desktop/rentVision/apps/web/messages/am.json) (Amharic target catalog)

Catalogs are structured as nested JSON objects organized by functional domains and UI components (e.g. `Header`, `Footer`, `Landing`, `Properties`, `PropertyDetail`, `PropertyGallery`, `SearchControls`, `States`).

```json
{
  "Header": {
    "home": "Home",
    "properties": "Properties"
  },
  "PropertyCard": {
    "pricePerMonth": "{price} ETB / month"
  }
}
```

---

## 3. How to Add a New Page Under `[locale]`

All user-facing pages must be located within the `apps/web/src/app/[locale]/` directory:

1. Create your folder under `apps/web/src/app/[locale]/`, for example:
   `apps/web/src/app/[locale]/about/page.tsx`
2. Define `generateStaticParams()` to pre-render both `en` and `am` routes:
   ```tsx
   import { routing } from "@/i18n/routing";

   export function generateStaticParams() {
     return routing.locales.map((locale: string) => ({ locale }));
   }
   ```
3. Always await `params`, set the request locale, and fetch translations:
   ```tsx
   import { getTranslations, setRequestLocale } from "next-intl/server";

   interface AboutPageProps {
     params: Promise<{ locale: string }>;
   }

   export default async function AboutPage({ params }: AboutPageProps) {
     const { locale } = await params;
     setRequestLocale(locale);

     const t = await getTranslations({ locale, namespace: "About" });

     return (
       <div className="about-page">
         <h1>{t("title")}</h1>
         <p>{t("description")}</p>
       </div>
     );
   }
   ```

---

## 4. How to Add Matching English and Amharic Keys

Every user-facing string added to `messages/en.json` **must have an exact, matching counterpart in `messages/am.json`**.

### Rules for Translation Keys:
1. **Never commit one-sided keys**: Adding a key to `en.json` without adding it to `am.json` will fail CI catalog validation.
2. **ICU Interpolation Variables**: Variable placeholders like `{count}`, `{price}`, `{name}` must match character-for-character between English and Amharic.
3. **No Empty Values**: All message values must contain non-empty strings.
4. **Key Ordering**: Object keys do not need to be sorted manually; validation parses nested paths as Sets.

Example:

In `messages/en.json`:
```json
"About": {
  "title": "About RentVision",
  "teamCount": "Our team includes {count} specialists."
}
```

In `messages/am.json`:
```json
"About": {
  "title": "ስለ ሬንትቪዥን",
  "teamCount": "ቡድናችን {count} ባለሙያዎችን ያካትታል።"
}
```

---

## 5. Accessing Translations in Components

### Server Components (`getTranslations`)
In React Server Components (RSC), retrieve translations asynchronously using `getTranslations` from `next-intl/server`:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

interface FeatureProps {
  locale: string;
}

export default async function FeatureSection({ locale }: FeatureProps) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Landing" });

  return <h2>{t("whyRentVision")}</h2>;
}
```

### Client Components (`useTranslations`)
In components marked with `"use client"`, access translations synchronously via the `useTranslations` hook from `next-intl`:

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function FilterButton() {
  const t = useTranslations("SearchControls");

  return <button type="button">{t("clearFilters")}</button>;
}
```

---

## 6. Preserving Locale in Navigation and Links

Never use Next.js's raw `next/link` or `next/navigation` directly for internal app links. Instead, use the locale-aware wrappers from `@/i18n/routing`:

```tsx
import { Link, useRouter, usePathname } from "@/i18n/routing";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav>
      {/* Link automatically prepends the active locale */}
      <Link href="/properties">Properties</Link>

      {/* Programmatic navigation preserves locale */}
      <button onClick={() => router.push("/map")}>Open Map</button>
    </nav>
  );
}
```

For custom button components, RentVision's `Button` component ([`apps/web/src/components/ui/Button.tsx`](file:///c:/Users/hp/Desktop/rentVision/apps/web/src/components/ui/Button.tsx)) automatically wraps `@/i18n/routing`'s `Link` when an `href` prop is supplied.

---

## 7. Dynamic Backend Content vs. Static UI Labels

### What Must Be Translated:
- All static UI copy, headings, descriptions, buttons, tooltips, and badges.
- Form field labels, placeholders, helper hints, and client-side validation errors.
- Accessible ARIA labels (`aria-label`, `aria-description`, breadcrumb labels, image alt text).
- Empty states, loading spinners, and error boundary messages.

### What Must NOT Be Translated:
- Internal system identifiers, database IDs, and UUIDs (e.g. `prop-001`).
- Enum keys in data payloads (e.g. `AVAILABLE`, `COMING_SOON`, `OCCUPIED`). *Note: Enum values must be mapped to UI labels using dedicated catalog namespaces like `Availability[property.availability]`.*
- Landlord-uploaded raw text, contract excerpts, or dynamic user comments.
- API route names, developer-facing console logs, or AWS error codes.
- Do **not** use a runtime LLM to translate static UI labels.

---

## 8. Missing-Translation & Fallback Behavior

RentVision employs an active multi-tiered defense against missing translations and unlocalized routes:

1. **Automatic Page Localization Scanner (`scripts/scan-pages.mjs`)**:
   - Recursively inspects `src/app` to ensure every newly created user-facing page resides under `src/app/[locale]/`.
   - Fails immediately if unlocalized pages are placed outside `[locale]`.
   - Verifies that pages call `setRequestLocale` or consume translation hooks (`useTranslations`/`getTranslations`).
   - Run manually with `npm run scan:pages`.
2. **Static Build Validation (`scripts/validate-catalogs.mjs`)**:
   - Evaluates `en.json` vs `am.json` directly from disk without fallbacks.
   - Catches missing keys, extra keys, empty strings, and ICU placeholder mismatches (`{count}`, `{price}`, etc.).
   - Integrated directly into `npm run check:i18n`, `npm test`, and `npm run build`.
3. **Automated Amharic Translation Engine (`scripts/translate-catalogs.mjs`)**:
   - Generates Amharic translations for newly created static UI strings using an Ethiopian real estate & UI lexicon.
   - Protects brand names (`RentVision`), Ethiopian location names (`Bole`, `Kazanchis`, `Sarbet`, `CMC`), currency symbols, and ICU interpolation variables.
   - Automatically writes persistent updates to `messages/am.json` and creates an audit manifest at `messages/.translation-review.json` for developer review and fine-tuning.
   - Run with `npm run translate:i18n`.
4. **Development Runtime**:
   - If a missing key is encountered during local development, `next-intl` returns a visible, conspicuous placeholder (e.g. `[Missing translation: Namespace.key]`) and logs an error to the terminal.
5. **Production Runtime Telemetry (No Silent Fallbacks)**:
   - If a translation is missing in a non-English locale (`am`), the application falls back to English to prevent broken UX, but **conspicuously logs `[i18n:untranslated]` to `console.error`** so missing strings are flagged in monitoring and telemetry. English fallback is never treated as successful localization.

---

## 9. Validation & Automation Commands

Run these commands from `apps/web`:

```powershell
# 1. Audit page hierarchy and localization architecture
npm run scan:pages

# 2. Validate translation catalog parity (en vs am)
npm run check:i18n

# 3. Automatically translate missing Amharic keys
npm run translate:i18n

# 4. Run all frontend and localization unit tests
npm test

# 5. Check TypeScript types
npx tsc --noEmit

# 6. Run ESLint checks
npm run lint

# 7. Production build test (includes check:i18n and next build)
npm run build
```

---

## 10. Pull Request & Feature Review Checklist

Before opening a pull request for new pages or components, verify each item:

- [ ] New page follows the locale-aware route structure (`apps/web/src/app/[locale]/...`).
- [ ] Static user-facing text uses translation keys (`useTranslations` or `getTranslations`).
- [ ] English and Amharic catalog keys match with 100% parity (`npm run check:i18n`).
- [ ] Language switching preserves the current route and query parameters.
- [ ] Forms, validation messages, empty states, and errors are localized.
- [ ] Dynamic content follows the documented translation policy.
- [ ] Relevant tests pass in both locales (`npm test`).
