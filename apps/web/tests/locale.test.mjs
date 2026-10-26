import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '../..');
const localeTsUrl = pathToFileURL(path.join(repoRoot, 'shared/contracts/locale.ts')).href;
const validatorUrl = pathToFileURL(path.join(rootDir, 'scripts/validate-catalogs.mjs')).href;
const fallbackTsUrl = pathToFileURL(path.join(rootDir, 'src/i18n/fallback.ts')).href;
const scannerUrl = pathToFileURL(path.join(rootDir, 'scripts/scan-pages.mjs')).href;
const translatorUrl = pathToFileURL(path.join(rootDir, 'scripts/translate-catalogs.mjs')).href;

test('Shared locale convention - isSupportedLocale', async () => {
  const { isSupportedLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } = await import(
    localeTsUrl
  );

  assert.deepEqual(SUPPORTED_LOCALES, ['en', 'am']);
  assert.equal(DEFAULT_LOCALE, 'en');

  assert.equal(isSupportedLocale('en'), true);
  assert.equal(isSupportedLocale('am'), true);
  assert.equal(isSupportedLocale('EN'), true);
  assert.equal(isSupportedLocale('AM'), true);
  assert.equal(isSupportedLocale('fr'), false);
  assert.equal(isSupportedLocale('es'), false);
  assert.equal(isSupportedLocale(null), false);
  assert.equal(isSupportedLocale(undefined), false);
});

test('Shared locale convention - resolveLocale precedence', async () => {
  const { resolveLocale } = await import(
    localeTsUrl
  );

  // 1. Explicit payload locale has highest priority
  assert.equal(
    resolveLocale({
      explicitLocale: 'am',
      savedPreference: 'en',
      acceptLanguageHeader: 'en-US,en;q=0.9',
    }),
    'am'
  );

  assert.equal(
    resolveLocale({
      explicitLocale: 'en',
      savedPreference: 'am',
      acceptLanguageHeader: 'am,en;q=0.8',
    }),
    'en'
  );

  // 2. Saved user preference takes priority when explicit locale is missing
  assert.equal(
    resolveLocale({
      savedPreference: 'am',
      acceptLanguageHeader: 'en-US,en;q=0.9',
    }),
    'am'
  );

  assert.equal(
    resolveLocale({
      savedPreference: 'en',
      acceptLanguageHeader: 'am,en;q=0.8',
    }),
    'en'
  );

  // 3. Accept-Language header parsed when neither explicit nor saved is present
  assert.equal(
    resolveLocale({
      acceptLanguageHeader: 'am,en-US;q=0.8',
    }),
    'am'
  );

  assert.equal(
    resolveLocale({
      acceptLanguageHeader: 'en-US,en;q=0.9,am;q=0.5',
    }),
    'en'
  );

  // 4. Default fallback: 'en'
  assert.equal(resolveLocale({}), 'en');
  assert.equal(resolveLocale(undefined), 'en');
  assert.equal(
    resolveLocale({
      explicitLocale: 'de',
      savedPreference: 'fr',
      acceptLanguageHeader: 'es-ES,es;q=0.9',
    }),
    'en'
  );
});

test('Translation catalogs - completeness and parity between en.json and am.json', () => {
  const enCatalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'messages/en.json'), 'utf8')
  );
  const amCatalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'messages/am.json'), 'utf8')
  );

  function getKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(getKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  const enKeys = getKeys(enCatalog).sort();
  const amKeys = getKeys(amCatalog).sort();

  assert.deepEqual(
    amKeys,
    enKeys,
    'Amharic message catalog keys must match English message catalog keys exactly'
  );

  // Ensure Amharic messages contain genuine Ethiopic characters for non-brand terms
  assert.match(amCatalog.Header.home, /[\u1200-\u137F]/);
  assert.match(amCatalog.Header.properties, /[\u1200-\u137F]/);
  assert.match(amCatalog.Landing.exploreProperties, /[\u1200-\u137F]/);
  assert.match(amCatalog.Properties.heading, /[\u1200-\u137F]/);
  assert.match(amCatalog.PropertyDetail.leaseHeading, /[\u1200-\u137F]/);
});

test('Document language and Ethiopic typography styling in globals.css', () => {
  const globalsCss = fs.readFileSync(
    path.join(rootDir, 'src/app/globals.css'),
    'utf8'
  );

  // Checks for :lang(am) with Ethiopic font family stack and line height
  assert.ok(
    globalsCss.includes(':lang(am)'),
    'globals.css must define :lang(am) selector for Amharic'
  );
  assert.ok(
    globalsCss.includes('Nyala') && globalsCss.includes('Abyssinica SIL'),
    'globals.css must include native Ethiopic font fallbacks'
  );

  const layoutContent = fs.readFileSync(
    path.join(rootDir, 'src/app/[locale]/layout.tsx'),
    'utf8'
  );
  assert.ok(
    layoutContent.includes('<html lang={locale}>'),
    'LocaleLayout must set <html lang={locale}> for document language'
  );
});

test('Accessible LanguageSwitcher component is integrated into Header', () => {
  const headerContent = fs.readFileSync(
    path.join(rootDir, 'src/components/layout/Header.tsx'),
    'utf8'
  );
  assert.ok(
    headerContent.includes('<LanguageSwitcher />') ||
      headerContent.includes('<LanguageSwitcher/>'),
    'Header must render LanguageSwitcher'
  );

  const switcherContent = fs.readFileSync(
    path.join(rootDir, 'src/components/LanguageSwitcher.tsx'),
    'utf8'
  );
  assert.ok(
    switcherContent.includes('aria-label') && switcherContent.includes('aria-pressed'),
    'LanguageSwitcher must have accessible aria attributes'
  );
});

test('Catalog validator - validateCatalogs confirms 100% parity on disk', async () => {
  const { validateCatalogs } = await import(validatorUrl);
  const enCatalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'messages/en.json'), 'utf8')
  );
  const amCatalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'messages/am.json'), 'utf8')
  );

  const result = validateCatalogs(enCatalog, amCatalog);
  assert.equal(result.isValid, true);
  assert.equal(result.missingInAm.length, 0);
  assert.equal(result.extraInAm.length, 0);
  assert.equal(result.emptyInEn.length, 0);
  assert.equal(result.emptyInAm.length, 0);
  assert.equal(result.placeholderMismatches.length, 0);
});

test('Catalog validator regression test - deliberately removing a key causes validation to fail without mutating catalog', async () => {
  const { validateCatalogs } = await import(validatorUrl);
  const enPath = path.join(rootDir, 'messages/en.json');
  const amPath = path.join(rootDir, 'messages/am.json');

  const pristineEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const pristineAm = JSON.parse(fs.readFileSync(amPath, 'utf8'));
  const diskContentBefore = fs.readFileSync(amPath, 'utf8');

  // Verify baseline passes
  assert.equal(validateCatalogs(pristineEn, pristineAm).isValid, true);

  // 1. In-memory clone mutation: remove a nested key
  const mutatedAm = JSON.parse(JSON.stringify(pristineAm));
  delete mutatedAm.Landing.features.discover.title;

  const failureResult = validateCatalogs(pristineEn, mutatedAm);
  assert.equal(failureResult.isValid, false);
  assert.ok(
    failureResult.missingInAm.includes('Landing.features.discover.title'),
    'Missing key must be detected with exact path'
  );

  // 2. Ensure pristine catalog was never mutated on disk
  const diskContentAfter = fs.readFileSync(amPath, 'utf8');
  assert.equal(
    diskContentAfter,
    diskContentBefore,
    'Catalog on disk must remain pristine and unmodified'
  );
});

test('Catalog validator on-disk regression test - temporary file mutation causes CLI validation to fail and file is restored', async () => {
  const { validateCatalogs } = await import(validatorUrl);
  const enPath = path.join(rootDir, 'messages/en.json');
  const amPath = path.join(rootDir, 'messages/am.json');

  const originalAmContent = fs.readFileSync(amPath, 'utf8');

  try {
    // Deliberately remove a key from on-disk am.json
    const parsed = JSON.parse(originalAmContent);
    delete parsed.Header.home;
    fs.writeFileSync(amPath, JSON.stringify(parsed, null, 2), 'utf8');

    // Run validator against disk files
    const mutatedAm = JSON.parse(fs.readFileSync(amPath, 'utf8'));
    const pristineEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const result = validateCatalogs(pristineEn, mutatedAm);

    assert.equal(result.isValid, false);
    assert.ok(
      result.missingInAm.includes('Header.home'),
      'Must report Header.home as missing'
    );
  } finally {
    // ALWAYS restore the original catalog
    fs.writeFileSync(amPath, originalAmContent, 'utf8');
  }

  // Verify file on disk is restored and fully passing
  const restoredAm = JSON.parse(fs.readFileSync(amPath, 'utf8'));
  const restoredEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const restoredResult = validateCatalogs(restoredEn, restoredAm);
  assert.equal(restoredResult.isValid, true);
  assert.equal(fs.readFileSync(amPath, 'utf8'), originalAmContent);
});

test('Catalog validator - detects extra keys, empty values, and placeholder mismatches', async () => {
  const { validateCatalogs } = await import(validatorUrl);
  const baseEn = {
    Common: { greeting: 'Hello {name}', blank: 'Not empty' },
    OnlyEn: { test: 'val' },
  };
  const baseAm = {
    Common: { greeting: 'ሰላም {user}', blank: '   ' }, // placeholder mismatch & empty string
    OnlyAm: { test: 'val' }, // extra key
  };

  const result = validateCatalogs(baseEn, baseAm);
  assert.equal(result.isValid, false);
  assert.ok(result.missingInAm.includes('OnlyEn.test'));
  assert.ok(result.extraInAm.includes('OnlyAm.test'));
  assert.ok(result.emptyInAm.includes('Common.blank'));
  assert.ok(
    result.placeholderMismatches.some(
      (m) => m.path === 'Common.greeting'
    )
  );
});

test('i18n Fallback & Error Handling - development mode highlights missing keys conspicuously', async () => {
  const { createGetMessageFallback } = await import(fallbackTsUrl);

  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    const fallbackFn = createGetMessageFallback('am', { Header: { home: 'Home' } });

    const output = fallbackFn({
      error: { code: 'MISSING_MESSAGE', message: 'Missing message' },
      key: 'home',
      namespace: 'Header',
    });

    assert.equal(output, '[Missing translation: Header.home]');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('i18n Fallback & Error Handling - production mode gracefully falls back to English catalog message', async () => {
  const { createGetMessageFallback } = await import(fallbackTsUrl);

  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const fallbackFn = createGetMessageFallback('am', {
      Header: { home: 'Home' },
      Landing: { features: { discover: { title: 'Discover' } } },
    });

    // 1. Fallback to English nested message for missing Amharic key
    const outputNested = fallbackFn({
      error: { code: 'MISSING_MESSAGE', message: 'Missing' },
      key: 'title',
      namespace: 'Landing.features.discover',
    });
    assert.equal(outputNested, 'Discover');

    // 2. Fallback to key when neither Amharic nor English catalog contains the key
    const outputMissing = fallbackFn({
      error: { code: 'MISSING_MESSAGE', message: 'Missing' },
      key: 'nonExistentKey',
      namespace: 'Header',
    });
    assert.equal(outputMissing, 'nonExistentKey');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('i18n Error Handling - createOnError logs informative development errors', async () => {
  const { createOnError } = await import(fallbackTsUrl);

  const errorsLogged = [];
  const origError = console.error;
  console.error = (...args) => errorsLogged.push(args.join(' '));

  try {
    const onErrorAm = createOnError('am');

    onErrorAm({ code: 'MISSING_MESSAGE', message: 'Could not resolve Header.nonExistent' });
    assert.ok(
      errorsLogged.some(
        (msg) =>
          msg.includes('[i18n:missing-message]') &&
          msg.includes('am') &&
          msg.includes('Header.nonExistent')
      ),
      'Must log missing message error with locale and message detail'
    );

    onErrorAm({ code: 'MISSING_FORMAT', message: 'Invalid format syntax' });
    assert.ok(
      errorsLogged.some(
        (msg) =>
          msg.includes('[i18n:error]') &&
          msg.includes('am') &&
          msg.includes('Invalid format syntax')
      ),
      'Must log general i18n error with locale and detail'
    );
  } finally {
    console.error = origError;
  }
});

test('Page Scanner - scanPages verifies all routes adhere to [locale] and detects unlocalized pages', async () => {
  const { scanPages } = await import(scannerUrl);

  // 1. Current codebase should pass cleanly
  const currentResult = scanPages();
  assert.equal(currentResult.isValid, true, 'Current codebase must have 0 unlocalized pages');
  assert.equal(currentResult.unlocalizedPages.length, 0);

  // 2. Mock directory with unlocalized page outside [locale] must fail
  const tempDir = path.join(rootDir, 'tests/.temp-app-scanner');
  fs.mkdirSync(path.join(tempDir, 'unlocalized-route'), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, 'unlocalized-route/page.tsx'),
    'export default function BadPage() { return <main><h1>Hardcoded English</h1></main>; }',
    'utf8'
  );

  try {
    const mockResult = scanPages(tempDir);
    assert.equal(mockResult.isValid, false, 'Scanner must fail when page is outside [locale]');
    assert.ok(
      mockResult.unlocalizedPages.some((p) => p.includes('unlocalized-route/page.tsx')),
      'Scanner must list unlocalized-route/page.tsx in unlocalizedPages'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Automated Translation - autoTranslateCatalogs translates missing keys and preserves tokens and brands', async () => {
  const { autoTranslateCatalogs } = await import(translatorUrl);

  const mockEn = {
    Common: {
      tagline: 'Find rentals in Addis Ababa',
      pricing: '{price} ETB / month in Bole',
      branding: 'Welcome to RentVision',
    },
    NewSection: {
      tourAction: 'Open 360° tour',
      bedrooms: '{count} bedrooms',
    },
  };

  const mockAm = {
    Common: {
      tagline: 'በአዲስ አበባ ውስጥ የቤት ኪራዮችን ያግኙ',
      // Missing pricing and branding
    },
    // Missing NewSection entirely
  };

  const result = autoTranslateCatalogs(mockEn, mockAm);

  assert.equal(result.translatedCount, 4);
  assert.ok(result.updatedAmCatalog.Common.branding.includes('RentVision'), 'Brand name RentVision must be preserved');
  assert.ok(result.updatedAmCatalog.Common.pricing.includes('{price}'), 'ICU {price} placeholder must be preserved');
  assert.ok(result.updatedAmCatalog.Common.pricing.includes('Bole'), 'Location Bole must be preserved');
  assert.ok(result.updatedAmCatalog.NewSection.bedrooms.includes('{count}'), 'ICU {count} placeholder must be preserved');
  assert.equal(result.updatedAmCatalog.NewSection.tourAction, 'የ360° ጉብኝት ይክፈቱ');
});

test('i18n Fallback Telemetry - logs [i18n:untranslated] warning to console.error when English fallback occurs in production', async () => {
  const { createGetMessageFallback } = await import(fallbackTsUrl);

  const prevEnv = process.env.NODE_ENV;
  const loggedErrors = [];
  const origError = console.error;
  console.error = (...args) => loggedErrors.push(args.join(' '));

  try {
    process.env.NODE_ENV = 'production';
    const fallbackFn = createGetMessageFallback('am', {
      PropertyDetail: {
        bedrooms: 'Bedrooms',
      },
    });

    const translated = fallbackFn({
      error: { code: 'MISSING_MESSAGE', message: 'Missing translation' },
      key: 'bedrooms',
      namespace: 'PropertyDetail',
    });

    assert.equal(translated, 'Bedrooms', 'Must fall back to English string');
    assert.ok(
      loggedErrors.some(
        (err) =>
          err.includes('[i18n:untranslated]') &&
          err.includes('PropertyDetail.bedrooms') &&
          err.includes('am')
      ),
      'Must conspicuously log [i18n:untranslated] to console.error telemetry'
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
    console.error = origError;
  }
});


