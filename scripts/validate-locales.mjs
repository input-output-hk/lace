import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'es', 'ja'];
const APP_DESC_MAX_CHARS = 132;

let failed = false;

const fail = message => {
  // eslint-disable-next-line no-console
  console.error(`❌ ${message}`);
  failed = true;
};

// --- Manifest checks ---

const manifestPath = resolve(
  repoRoot,
  'apps/lace-extension/assets/manifest.json',
);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  fail(`Could not read or parse ${manifestPath}`);
  process.exit(1);
}

if (manifest.name !== '$EXTENSION_NAME')
  fail(
    `manifest.json 'name' must be '$EXTENSION_NAME', got '${manifest.name}'`,
  );

if (manifest.description !== '__MSG_appDesc__')
  fail(
    `manifest.json 'description' must be '__MSG_appDesc__', got '${manifest.description}'`,
  );

if (manifest.default_locale !== 'en')
  fail(
    `manifest.json 'default_locale' must be 'en', got '${manifest.default_locale}'`,
  );

// --- Locale file checks ---

const localeData = {};

for (const locale of LOCALES) {
  const filePath = resolve(
    repoRoot,
    `apps/lace-extension/assets/_locales/${locale}/messages.json`,
  );

  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    fail(`Could not read or parse ${filePath}`);
    continue;
  }

  if (typeof data.appName?.message !== 'string' || !data.appName.message)
    fail(
      `_locales/${locale}/messages.json: 'appName.message' must be a non-empty string`,
    );

  if (typeof data.appDesc?.message !== 'string' || !data.appDesc.message)
    fail(
      `_locales/${locale}/messages.json: 'appDesc.message' must be a non-empty string`,
    );
  else if (data.appDesc.message.length > APP_DESC_MAX_CHARS)
    fail(
      `_locales/${locale}/messages.json: 'appDesc.message' is ${data.appDesc.message.length} chars (max ${APP_DESC_MAX_CHARS})`,
    );

  localeData[locale] = data;
}

// --- Key consistency check ---

const loadedLocales = Object.keys(localeData);
if (loadedLocales.length > 1) {
  const referenceKeys = Object.keys(localeData[loadedLocales[0]])
    .sort()
    .join(',');
  for (const locale of loadedLocales.slice(1)) {
    const keys = Object.keys(localeData[locale]).sort().join(',');
    if (keys !== referenceKeys)
      fail(
        `_locales/${locale}/messages.json has different keys than _locales/${loadedLocales[0]}/messages.json`,
      );
  }
}

// --- Result ---

if (failed) {
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('✅ _locales validation passed');
