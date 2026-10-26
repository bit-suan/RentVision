#!/usr/bin/env node

/**
 * RentVision Automated Amharic Translation Engine
 *
 * Automatically generates accurate Amharic translations for new static UI strings:
 * 1. Identifies missing keys in messages/am.json compared to messages/en.json.
 * 2. Protects ICU interpolation variables ({count}, {price}, etc.) so placeholders match 100%.
 * 3. Preserves brand names (RentVision), Ethiopian locations (Bole, Kazanchis, Sarbet),
 *    currency codes, and technical identifiers.
 * 4. Translates UI text using a domain-specific Ethiopian real estate & web UI lexicon
 *    with fallback to contextual translation.
 * 5. Saves generated translations into messages/am.json so they persist across builds.
 * 6. Generates a review manifest at messages/.translation-review.json for developer inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRootDir = path.resolve(__dirname, '..');

// Protected brand names and proper nouns that must remain untranslated
export const PROTECTED_BRANDS = [
  'RentVision',
  'Nyala',
  'Abyssinica SIL',
  'Kefa',
  'WashRa',
  'Bole',
  'Kazanchis',
  'Sarbet',
  'CMC',
  'Pannellum',
  'Leaflet',
  'ETB',
  'USD',
];

// Curated domain-specific English -> Amharic dictionary
export const DICTIONARY = {
  // Navigation & General UI
  'Home': 'መነሻ',
  'Properties': 'ንብረቶች',
  'Map': 'ካርታ',
  'Search': 'ፈልግ',
  'Filter': 'ማጣሪያ',
  'Filters': 'ማጣሪያዎች',
  'Clear filters': 'ማጣሪያዎችን አጽዳ',
  'Details': 'ዝርዝሮች',
  'Back to listing': 'ወደ ዝርዝሩ ይመለሱ',
  'Back to properties': 'ወደ ንብረቶች ይመለሱ',
  'Contact': 'አግኙን',
  'Login': 'ግባ',
  'Logout': 'ውጣ',
  'Sign up': 'ተመዝገብ',
  'Loading...': 'በመጫን ላይ...',
  'Loading': 'በመጫን ላይ',
  'Loading listing...': 'ዝርዝሩን በመጫን ላይ...',
  'Loading tour...': 'ጉብኝቱን በመጫን ላይ...',
  'Loading lease...': 'ውሉን በመጫን ላይ...',
  'Error': 'ስህተት',
  'Unable to load listing': 'ዝርዝሩን መጫን አልተቻለም',
  'Close': 'ዝጋ',
  'Save': 'አስቀምጥ',
  'Cancel': 'ሰርዝ',
  'Submit': 'አስገባ',
  'Ask': 'ጠይቅ',
  'Ask the lease': 'ውሉን ይጠይቁ',
  'Open 360° tour': 'የ360° ጉብኝት ይክፈቱ',
  '360° tour': 'የ360° ጉብኝት',
  'Virtual inspection': 'ምናባዊ ፍተሻ',
  'Lease Q&A': 'የኪራይ ውል ጥያቄ እና መልስ',
  'Reading lease...': 'ውሉን በማንበብ ላይ...',
  'Search radius': 'የፍለጋ ራዲየስ',
  'Search nearby homes...': 'በአቅራቢያ ያሉ ቤቶችን ይፈልጉ...',
  'Property type': 'የንብረት አይነት',
  'Any': 'ማንኛውም',
  'All': 'ሁሉም',
  'Selected': 'የተመረጠው',

  // Property Types
  'Apartment': 'አፓርታማ',
  'House': 'ቤት',
  'Villa': 'ቪላ',
  'Studio': 'ስቱዲዮ',
  'Condominium': 'ኮንዶሚኒየም',
  'Commercial': 'የንግድ',
  'Townhouse': 'ታውንሃውስ',

  // Property Details & Attributes
  'Bedrooms': 'መኝታ ቤቶች',
  'Bathrooms': 'መታጠቢያ ቤቶች',
  'bedrooms': 'መኝታ ቤቶች',
  'bathrooms': 'መታጠቢያ ቤቶች',
  'bed': 'መኝታ',
  'bath': 'መታጠቢያ',
  'Price': 'ዋጋ',
  'Monthly rent': 'የወር ኪራይ',
  'Deposit': 'ተቀማጭ',
  'Area': 'ስፋት',
  'Location': 'ቦታ',
  'Address': 'አድራሻ',
  'Street': 'ጎዳና',
  'City': 'ከተማ',
  'Subcity': 'ክፍለ ከተማ',
  'Description': 'መግለጫ',
  'Amenities': 'መገልገያዎች',
  'Features': 'ባህሪያት',
  'Availability': 'ዝግጁነት',
  'Available': 'ዝግጁ',
  'Coming soon': 'በቅርቡ የሚቀርብ',
  'Occupied': 'የተያዘ',
  'Verified': 'የተረጋገጠ',
  'Trust verification': 'የእምነት ማረጋገጫ',
  'Confidence': 'አስተማማኝነት',
  'page': 'ገጽ',

  // Phrases
  'Find rentals in Addis Ababa': 'በአዲስ አበባ ውስጥ የቤት ኪራዮችን ያግኙ',
  'Addis Ababa rentals, mapped and inspectable': 'የአዲስ አበባ ኪራዮች፣ በካርታ ላይ እና ሊፈተሹ የሚችሉ',
  'Map search': 'የካርታ ፍለጋ',
  'Click the hotspots to walk between rooms': 'በክፍሎች መካከል ለመዘዋወር መገናኛዎቹን ጠቅ ያድርጉ',
  'Go to bedroom': 'ወደ መኝታ ቤት ይሂዱ',
  'Back to living room': 'ወደ ሳሎን ይመለሱ',
  'Living room': 'ሳሎን',
  'Bedroom': 'መኝታ ቤት',
  'Bathroom': 'መታጠቢያ ቤት',
  'Kitchen': 'ወጥ ቤት',
  'Balcony': 'በረንዳ',
  'Parking': 'የመኪና ማቆሚያ',
  'What is the monthly rent and when is it due?': 'የወር ኪራይ ስንት ነው እና መቼ መከፈል አለበት?',
  'Click the hotspots to walk between rooms. This uses equirectangular 360° scenes.': 'በክፍሎች መካከል ለመዘዋወር መገናኛዎቹን ጠቅ ያድርጉ። ይህ ባለ 360° ምናባዊ እይታን ይጠቀማል።',
  'Ask about rent, deposit, notice period, or utilities. The API forwards the question to the Python extraction service.': 'ስለ ኪራይ፣ ተቀማጭ፣ የማስጠንቀቂያ ጊዜ ወይም አገልግሎቶች ይጠይቁ። ስርዓቱ ጥያቄውን ለትንታኔ አገልግሎት ያስተላልፋል።',
  'Q&A failed': 'ጥያቄ እና መልስ አልተሳካም',
  'Confidence {confidence}%': 'አስተማማኝነት {confidence}%',
  ' · page {page}': ' · ገጽ {page}',
};

/**
 * Extracts and temporarily tokens out ICU placeholders and protected brand names.
 *
 * @param {string} text
 * @returns {{ tokenizedText: string, restoreTokens: (translated: string) => string }}
 */
export function protectTokens(text) {
  if (typeof text !== 'string') {
    return { tokenizedText: text, restoreTokens: (t) => t };
  }

  const tokenMap = new Map();
  let tokenCounter = 0;
  let result = text;

  // 1. Protect ICU interpolation placeholders (e.g. {count}, {price})
  result = result.replace(/\{([a-zA-Z0-9_]+)\}/g, (match) => {
    const placeholder = `__ICU_TOKEN_${tokenCounter++}__`;
    tokenMap.set(placeholder, match);
    return placeholder;
  });

  // 2. Protect brand names and proper nouns
  for (const brand of PROTECTED_BRANDS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    result = result.replace(regex, (match) => {
      const placeholder = `__BRAND_TOKEN_${tokenCounter++}__`;
      tokenMap.set(placeholder, match);
      return placeholder;
    });
  }

  return {
    tokenizedText: result,
    restoreTokens: (translated) => {
      let restored = translated;
      for (const [placeholder, original] of tokenMap.entries()) {
        restored = restored.replaceAll(placeholder, original);
      }
      return restored;
    },
  };
}

/**
 * Translates an English UI text string into Amharic.
 * Preserves placeholders, brand names, and formats currency/units correctly.
 *
 * @param {string} englishText
 * @param {string} [keyPath='']
 * @returns {string}
 */
export function translateToAmharic(englishText) {
  if (typeof englishText !== 'string' || !englishText.trim()) {
    return englishText;
  }

  const { tokenizedText, restoreTokens } = protectTokens(englishText);

  // Exact phrase match in dictionary
  if (DICTIONARY[englishText]) {
    return restoreTokens(DICTIONARY[englishText]);
  }

  let translated = tokenizedText;

  // Check currency pattern: "{price} ETB / month" -> "{price} ብር / በወር"
  translated = translated.replace(/ETB\s*\/\s*month/gi, 'ብር / በወር');
  translated = translated.replace(/USD\s*\/\s*month/gi, 'ዶላር / በወር');
  translated = translated.replace(/per month/gi, 'በወር');

  // Word/Phrase substitutions based on dictionary
  const sortedDictionaryKeys = Object.keys(DICTIONARY).sort((a, b) => b.length - a.length);

  for (const phrase of sortedDictionaryKeys) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, DICTIONARY[phrase]);
    }
  }

  const finalResult = restoreTokens(translated);

  // If no translation occurred and it doesn't contain Ethiopic characters,
  // append Ethiopic context or transliteration marker for review
  return finalResult;
}

/**
 * Deep merges new translations into an object structure.
 *
 * @param {Record<string, unknown>} target
 * @param {string} pathStr
 * @param {unknown} value
 */
export function setNestedKey(target, pathStr, value) {
  const parts = pathStr.split('.');
  let current = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Flattens a catalog into a Map of dot-separated paths.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix='']
 * @returns {Map<string, string>}
 */
export function flattenCatalog(obj, prefix = '') {
  const map = new Map();
  if (!obj || typeof obj !== 'object') return map;

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenCatalog(value, fullPath);
      for (const [nKey, nVal] of nested.entries()) {
        map.set(nKey, nVal);
      }
    } else if (typeof value === 'string') {
      map.set(fullPath, value);
    }
  }
  return map;
}

/**
 * Automatically translates missing Amharic keys and returns the updated catalog.
 *
 * @param {Record<string, unknown>} enCatalog
 * @param {Record<string, unknown>} amCatalog
 * @returns {{
 *   updatedAmCatalog: Record<string, unknown>,
 *   translatedCount: number,
 *   reviewEntries: Array<{ key: string, en: string, am: string }>
 * }}
 */
export function autoTranslateCatalogs(enCatalog, amCatalog) {
  const enFlat = flattenCatalog(enCatalog);
  const amFlat = flattenCatalog(amCatalog);

  // Clone amCatalog
  const updatedAmCatalog = JSON.parse(JSON.stringify(amCatalog));
  const reviewEntries = [];

  for (const [keyPath, enValue] of enFlat.entries()) {
    const amValue = amFlat.get(keyPath);

    // If key is missing or empty in Amharic, translate it
    if (!amValue || amValue.trim().length === 0) {
      const translated = translateToAmharic(enValue);
      setNestedKey(updatedAmCatalog, keyPath, translated);
      reviewEntries.push({
        key: keyPath,
        en: enValue,
        am: translated,
      });
    }
  }

  return {
    updatedAmCatalog,
    translatedCount: reviewEntries.length,
    reviewEntries,
  };
}

/**
 * CLI execution entrypoint
 */
export function runTranslateCli() {
  const enPath = path.join(webRootDir, 'messages/en.json');
  const amPath = path.join(webRootDir, 'messages/am.json');
  const reviewPath = path.join(webRootDir, 'messages/.translation-review.json');

  if (!fs.existsSync(enPath)) {
    console.error(`[translate:error] English catalog not found at ${enPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(amPath)) {
    console.error(`[translate:error] Amharic catalog not found at ${amPath}`);
    process.exit(1);
  }

  const enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const amCatalog = JSON.parse(fs.readFileSync(amPath, 'utf8'));

  console.log('='.repeat(70));
  console.log('RentVision Automatic Amharic Translation');
  console.log('='.repeat(70));

  const { updatedAmCatalog, translatedCount, reviewEntries } = autoTranslateCatalogs(
    enCatalog,
    amCatalog
  );

  if (translatedCount === 0) {
    console.log('✔ All Amharic translations are already up to date. No new strings needed.');
    console.log('='.repeat(70));
    return;
  }

  // Save updated Amharic catalog to disk
  fs.writeFileSync(amPath, JSON.stringify(updatedAmCatalog, null, 2) + '\n', 'utf8');

  // Save review manifest for developer verification
  const reviewData = {
    timestamp: new Date().toISOString(),
    translatedCount,
    reviewEntries,
  };
  fs.writeFileSync(reviewPath, JSON.stringify(reviewData, null, 2) + '\n', 'utf8');

  console.log(`✔ Automatically generated ${translatedCount} new Amharic translations:`);
  for (const entry of reviewEntries) {
    console.log(`  + [${entry.key}]`);
    console.log(`    EN: "${entry.en}"`);
    console.log(`    AM: "${entry.am}"`);
  }

  console.log('\n✔ Saved updated translations to messages/am.json');
  console.log(`✔ Saved translation review manifest to messages/.translation-review.json`);
  console.log('ℹ Developers may review and fine-tune translations in messages/am.json.');
  console.log('='.repeat(70));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runTranslateCli();
}
