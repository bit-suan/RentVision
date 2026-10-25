#!/usr/bin/env node

/**
 * RentVision Translation Catalog Validator
 *
 * Compares English (canonical source) and Amharic translation catalogs:
 * - Detects missing keys in Amharic (or English)
 * - Detects unexpected extra keys
 * - Traverses nested namespaces recursively
 * - Detects type/structure mismatches (e.g. object vs string)
 * - Flags empty translation values (unless explicitly allowlisted)
 * - Validates ICU interpolation placeholders ({count}, {price}, etc.)
 * - Ignores object key ordering to eliminate false positives
 * - Returns exit code 1 if differences or violations are detected
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPages } from './scan-pages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRootDir = path.resolve(__dirname, '..');

/**
 * Recursively flattens a nested translation catalog into a map of dot-separated paths.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix='']
 * @returns {Map<string, { value: unknown, type: string }>}
 */
export function flattenCatalog(obj, prefix = '') {
  const result = new Map();

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return result;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenCatalog(value, fullPath);
      for (const [nestedPath, nestedEntry] of nested.entries()) {
        result.set(nestedPath, nestedEntry);
      }
    } else {
      result.set(fullPath, {
        value,
        type: typeof value,
      });
    }
  }

  return result;
}

/**
 * Extracts ICU interpolation placeholders like {count}, {price} from a string.
 *
 * @param {string} str
 * @returns {string[]}
 */
export function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))].sort();
}

/**
 * Validates translation catalogs for parity, completeness, and correctness.
 *
 * @param {Record<string, unknown>} enCatalog
 * @param {Record<string, unknown>} amCatalog
 * @param {{ allowedEmptyPaths?: string[] }} [options={}]
 * @returns {{
 *   isValid: boolean,
 *   totalKeys: number,
 *   missingInAm: string[],
 *   extraInAm: string[],
 *   emptyInEn: string[],
 *   emptyInAm: string[],
 *   typeMismatches: Array<{ path: string, enType: string, amType: string }>,
 *   placeholderMismatches: Array<{ path: string, enPlaceholders: string[], amPlaceholders: string[] }>
 * }}
 */
export function validateCatalogs(enCatalog, amCatalog, options = {}) {
  const allowedEmpty = new Set(options.allowedEmptyPaths || []);
  const enFlat = flattenCatalog(enCatalog);
  const amFlat = flattenCatalog(amCatalog);

  const missingInAm = [];
  const extraInAm = [];
  const emptyInEn = [];
  const emptyInAm = [];
  const typeMismatches = [];
  const placeholderMismatches = [];

  // Check English keys against Amharic
  for (const [keyPath, enEntry] of enFlat.entries()) {
    if (!amFlat.has(keyPath)) {
      missingInAm.push(keyPath);
      continue;
    }

    const amEntry = amFlat.get(keyPath);

    // Type check
    if (enEntry.type !== amEntry.type) {
      typeMismatches.push({
        path: keyPath,
        enType: enEntry.type,
        amType: amEntry.type,
      });
      continue;
    }

    // Empty value check for English
    if (
      typeof enEntry.value === 'string' &&
      enEntry.value.trim().length === 0 &&
      !allowedEmpty.has(keyPath)
    ) {
      emptyInEn.push(keyPath);
    }

    // Empty value check for Amharic
    if (
      typeof amEntry.value === 'string' &&
      amEntry.value.trim().length === 0 &&
      !allowedEmpty.has(keyPath)
    ) {
      emptyInAm.push(keyPath);
    }

    // Placeholder parity check
    if (typeof enEntry.value === 'string' && typeof amEntry.value === 'string') {
      const enPlaceholders = extractPlaceholders(enEntry.value);
      const amPlaceholders = extractPlaceholders(amEntry.value);
      const enSet = new Set(enPlaceholders);
      const amSet = new Set(amPlaceholders);

      const hasDiff =
        enPlaceholders.length !== amPlaceholders.length ||
        enPlaceholders.some((p) => !amSet.has(p)) ||
        amPlaceholders.some((p) => !enSet.has(p));

      if (hasDiff) {
        placeholderMismatches.push({
          path: keyPath,
          enPlaceholders,
          amPlaceholders,
        });
      }
    }
  }

  // Check for extra keys in Amharic that don't exist in English
  for (const keyPath of amFlat.keys()) {
    if (!enFlat.has(keyPath)) {
      extraInAm.push(keyPath);
    }
  }

  // Sort arrays for deterministic reporting
  missingInAm.sort();
  extraInAm.sort();
  emptyInEn.sort();
  emptyInAm.sort();

  const isValid =
    missingInAm.length === 0 &&
    extraInAm.length === 0 &&
    emptyInEn.length === 0 &&
    emptyInAm.length === 0 &&
    typeMismatches.length === 0 &&
    placeholderMismatches.length === 0;

  return {
    isValid,
    totalKeys: enFlat.size,
    missingInAm,
    extraInAm,
    emptyInEn,
    emptyInAm,
    typeMismatches,
    placeholderMismatches,
  };
}

/**
 * CLI execution entrypoint
 */
export function runCli() {
  // 1. Audit page hierarchy and localization architecture first
  const scanResult = scanPages();
  if (!scanResult.isValid) {
    console.error('='.repeat(70));
    console.error('✖ UNLOCALIZED PAGES DETECTED:');
    console.error('All new user-facing pages must be created under src/app/[locale]/');
    for (const page of scanResult.unlocalizedPages) {
      console.error(`  ✖ src/app/${page}`);
    }
    console.error('\nTo fix: Move these pages to src/app/[locale]/ and configure localization.');
    console.error('='.repeat(70));
    process.exit(1);
  }

  const enPath = path.join(webRootDir, 'messages/en.json');
  const amPath = path.join(webRootDir, 'messages/am.json');

  if (!fs.existsSync(enPath)) {
    console.error(`[i18n-check:error] English catalog not found at: ${enPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(amPath)) {
    console.error(`[i18n-check:error] Amharic catalog not found at: ${amPath}`);
    process.exit(1);
  }

  let enCatalog;
  let amCatalog;

  try {
    enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } catch (err) {
    console.error(`[i18n-check:error] Failed to parse messages/en.json:`, err.message);
    process.exit(1);
  }

  try {
    amCatalog = JSON.parse(fs.readFileSync(amPath, 'utf8'));
  } catch (err) {
    console.error(`[i18n-check:error] Failed to parse messages/am.json:`, err.message);
    process.exit(1);
  }

  const result = validateCatalogs(enCatalog, amCatalog);

  console.log('='.repeat(70));
  console.log('RentVision Translation Catalog Validation');
  console.log('='.repeat(70));
  console.log(`Source Catalog (EN): messages/en.json (${result.totalKeys} keys)`);
  console.log(`Target Catalog (AM): messages/am.json`);
  console.log('-'.repeat(70));

  if (result.isValid) {
    console.log(
      `✔ ALL CHECKS PASSED: 100% parity across ${result.totalKeys} translation keys.`
    );
    console.log('  - All app pages follow [locale] routing hierarchy');
    console.log('  - No missing keys');
    console.log('  - No extra or orphaned keys');
    console.log('  - No empty translation strings');
    console.log('  - All ICU interpolation variables match');
    console.log('='.repeat(70));
    process.exit(0);
  }

  console.error('✖ VALIDATION FAILED: Translation catalog discrepancies detected!\n');

  if (result.missingInAm.length > 0) {
    console.error(`Missing keys in Amharic (${result.missingInAm.length}):`);
    for (const key of result.missingInAm) {
      console.error(`  - ${key}`);
    }
    console.error('\n💡 To automatically generate Amharic translations, run:');
    console.error('   npm run translate:i18n\n');
  }

  if (result.extraInAm.length > 0) {
    console.error(
      `Unexpected extra keys in Amharic (missing in English) (${result.extraInAm.length}):`
    );
    for (const key of result.extraInAm) {
      console.error(`  + ${key}`);
    }
    console.error('');
  }

  if (result.emptyInEn.length > 0) {
    console.error(`Empty translation strings in English (${result.emptyInEn.length}):`);
    for (const key of result.emptyInEn) {
      console.error(`  ! ${key}`);
    }
    console.error('');
  }

  if (result.emptyInAm.length > 0) {
    console.error(`Empty translation strings in Amharic (${result.emptyInAm.length}):`);
    for (const key of result.emptyInAm) {
      console.error(`  ! ${key}`);
    }
    console.error('');
  }

  if (result.typeMismatches.length > 0) {
    console.error(`Data type mismatches (${result.typeMismatches.length}):`);
    for (const item of result.typeMismatches) {
      console.error(`  * ${item.path} (EN: ${item.enType}, AM: ${item.amType})`);
    }
    console.error('');
  }

  if (result.placeholderMismatches.length > 0) {
    console.error(`ICU placeholder mismatches (${result.placeholderMismatches.length}):`);
    for (const item of result.placeholderMismatches) {
      console.error(
        `  * ${item.path} -> EN: {${item.enPlaceholders.join(', ')}} vs AM: {${item.amPlaceholders.join(', ')}}`
      );
    }
    console.error('');
  }

  console.error('='.repeat(70));
  process.exit(1);
}

// Execute CLI when invoked directly
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
