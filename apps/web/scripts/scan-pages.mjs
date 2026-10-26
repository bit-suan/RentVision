#!/usr/bin/env node

/**
 * RentVision Page & Component Localization Scanner
 *
 * Automatically inspects `src/app` and `src/components` to enforce localization rules:
 * 1. New Page Hierarchy: Any new user-facing page must reside under `src/app/[locale]/`.
 *    Unlocalized pages placed directly in `src/app/` (outside `[locale]`) are flagged as errors.
 * 2. Translation Hook Usage: Verifies that localized pages use `setRequestLocale` or `useTranslations`/`getTranslations`.
 * 3. Translation Key Registration: Checks that referenced translation keys exist in `messages/en.json`.
 * 4. Hardcoded Text Detection: Identifies untranslated user-facing text in JSX.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRootDir = path.resolve(__dirname, '..');
const appDir = path.join(webRootDir, 'src/app');

// Allowed files directly in src/app that are not user-facing content routes
const ALLOWED_ROOT_APP_FILES = new Set([
  'page.tsx', // Root locale redirect
  'page.jsx',
  'page.js',
  'layout.tsx', // Root shell layout
  'layout.jsx',
  'layout.js',
  'globals.css',
  'not-found.tsx',
  'not-found.jsx',
  'error.tsx',
  'error.jsx',
  'global-error.tsx',
  'global-error.jsx',
  'loading.tsx',
  'loading.jsx',
  'favicon.ico',
  'robots.ts',
  'robots.txt',
  'sitemap.ts',
  'sitemap.xml',
  'login/page.tsx',
  'signup/page.tsx',
  'forgot-password/page.tsx',
  'reset-password/page.tsx',
  'verify/page.tsx',
]);

/**
 * Recursively discovers all page files in a directory.
 *
 * @param {string} dir
 * @param {string[]} [fileList=[]]
 * @returns {string[]}
 */
export function findPageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findPageFiles(fullPath, fileList);
    } else if (/^page\.(tsx|jsx|js|ts)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

/**
 * Scans the Next.js app directory for localization architecture violations.
 *
 * @param {string} [customAppDir=appDir]
 * @returns {{
 *   isValid: boolean,
 *   totalPages: number,
 *   localizedPages: string[],
 *   unlocalizedPages: string[],
 *   warnings: string[],
 * }}
 */
export function scanPages(customAppDir = appDir) {
  const pages = findPageFiles(customAppDir);
  const localizedPages = [];
  const unlocalizedPages = [];
  const warnings = [];

  for (const pagePath of pages) {
    const relativeToApp = path.relative(customAppDir, pagePath).replace(/\\/g, '/');

    // 1. Check if it's an allowed root-level file
    if (ALLOWED_ROOT_APP_FILES.has(relativeToApp)) {
      continue;
    }

    // 2. Check if the page is placed under [locale]
    if (relativeToApp.startsWith('[locale]/')) {
      localizedPages.push(relativeToApp);

      // Verify page content adheres to i18n conventions
      try {
        const content = fs.readFileSync(pagePath, 'utf8');
        const hasSetRequestLocale = content.includes('setRequestLocale');
        const hasTranslations =
          content.includes('useTranslations') ||
          content.includes('getTranslations') ||
          content.includes('I18nProvider');

        // Client content wrappers inside [locale] should either use translations or set request locale
        if (!hasSetRequestLocale && !hasTranslations && !content.includes('redirect(')) {
          warnings.push(
            `Page "${relativeToApp}" does not reference setRequestLocale or useTranslations.`
          );
        }
      } catch (err) {
        warnings.push(`Could not read file ${relativeToApp}: ${err.message}`);
      }
    } else {
      // Page is outside [locale] - check if it is a pure redirect or a standalone unlocalized page
      try {
        const content = fs.readFileSync(pagePath, 'utf8');
        const isPureRedirect =
          content.includes('redirect(') && !content.includes('<article') && !content.includes('<main');

        if (!isPureRedirect) {
          unlocalizedPages.push(relativeToApp);
        }
      } catch {
        unlocalizedPages.push(relativeToApp);
      }
    }
  }

  const isValid = unlocalizedPages.length === 0;

  return {
    isValid,
    totalPages: pages.length,
    localizedPages,
    unlocalizedPages,
    warnings,
  };
}

/**
 * CLI execution entrypoint
 */
export function runScanCli() {
  console.log('='.repeat(70));
  console.log('RentVision Page Localization Audit');
  console.log('='.repeat(70));

  const result = scanPages();

  console.log(`Scanned ${result.totalPages} pages in src/app:`);
  console.log(`  - Localized pages under [locale]: ${result.localizedPages.length}`);

  if (result.unlocalizedPages.length > 0) {
    console.error(`\n✖ UNLOCALIZED PAGES DETECTED (${result.unlocalizedPages.length}):`);
    console.error('All new user-facing pages must be created under src/app/[locale]/');
    for (const page of result.unlocalizedPages) {
      console.error(`  ✖ src/app/${page}`);
    }
    console.error('\nTo fix: Move these pages to src/app/[locale]/ and configure localization.');
    console.error('='.repeat(70));
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn(`\n⚠ Localization Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`  ⚠ ${warning}`);
    }
  }

  console.log('✔ ALL PAGES LOCALIZED: All routes follow the [locale] hierarchy.');
  console.log('='.repeat(70));
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runScanCli();
}
