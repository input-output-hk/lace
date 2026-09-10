import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Locale key-set parity guard (LW-15041 T201, upstream-merge lesson).
 *
 * Failure mode this pins: a git textual auto-merge of the translation JSONs
 * can silently DROP a key from a non-conflicting hunk — exactly what happened
 * in the feat/lace-next resync merge (`v2.account-details.add-wallet-hardware
 * .error.already-paired` vanished from all three locales without a conflict
 * marker). The typed-key layer only type-checks keys REFERENCED from source
 * against `en`, so an es/ja-only drop (or an en key present but missing in
 * es/ja) is invisible to the compiler. This test closes that gap: every
 * locale file must carry an IDENTICAL key set.
 */
const TRANSLATIONS_DIR = fileURLToPath(
  new URL('../src/translations', import.meta.url),
);

const localeFiles = readdirSync(TRANSLATIONS_DIR)
  .filter(name => name.endsWith('.json'))
  .sort();

const entriesOf = (fileName: string): Record<string, string> =>
  JSON.parse(readFileSync(join(TRANSLATIONS_DIR, fileName), 'utf8')) as Record<
    string,
    string
  >;

const keysOf = (fileName: string): Set<string> =>
  new Set(Object.keys(entriesOf(fileName)));

/** i18next interpolation placeholders: `{{token}}` (whitespace-tolerant). */
const INTERPOLATION_TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Canonical (sorted, joined) token multiset of one translation value. */
const tokensOf = (value: string): string =>
  [...value.matchAll(INTERPOLATION_TOKEN)]
    .map(match => match[1])
    .sort()
    .join('|');

/**
 * i18next plural-form keys (`_one`, `_other`, …). A locale's plural variant
 * may legitimately OMIT `{{count}}` (fixed cardinality is often written out:
 * en "{{count}} option" vs es "una opción") — that is translation practice,
 * not mangling. Only the `count` token may be dropped, only on these keys;
 * every other token must match exactly.
 */
const PLURAL_SUFFIX = /_(few|many|one|other|two|zero)$/;

const tokensMatchEn = (
  key: string,
  enValue: string,
  value: string,
): boolean => {
  const enTokens = tokensOf(enValue);
  const localeTokens = tokensOf(value);
  if (enTokens === localeTokens) return true;
  if (!PLURAL_SUFFIX.test(key)) return false;
  const enMinusCount = [...enValue.matchAll(INTERPOLATION_TOKEN)]
    .map(match => match[1])
    .filter(token => token !== 'count')
    .sort()
    .join('|');
  return localeTokens === enMinusCount;
};

describe('translation locale key parity (every locale carries the identical key set)', () => {
  it('sanity: multiple locale files exist and are non-trivial (anti-tautology)', () => {
    expect(localeFiles).toContain('en.json');
    expect(localeFiles.length).toBeGreaterThanOrEqual(3);
    expect(keysOf('en.json').size).toBeGreaterThan(1000);
  });

  it.each(localeFiles.filter(name => name !== 'en.json'))(
    '%s has exactly the same key set as en.json (no dropped or extra keys)',
    localeFile => {
      const enKeys = keysOf('en.json');
      const localeKeys = keysOf(localeFile);
      const missing = [...enKeys].filter(key => !localeKeys.has(key));
      const extra = [...localeKeys].filter(key => !enKeys.has(key));
      // Report the exact asymmetric keys on failure, not just a count.
      expect(missing, `keys in en.json missing from ${localeFile}`).toEqual([]);
      expect(extra, `keys in ${localeFile} absent from en.json`).toEqual([]);
    },
  );

  // VALUE SANITY (LW-15041 T201 round 2, cross-model). SCOPE: these guards
  // catch MERGE-MANGLING classes — dropped keys (above), broken/renamed
  // `{{placeholders}}`, and emptied values. Semantic translation QUALITY is
  // human-reviewed, deliberately NOT CI-judged.
  it.each(localeFiles)('%s: every value is a non-empty string', localeFile => {
    const empty = Object.entries(entriesOf(localeFile))
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key);
    expect(empty, `empty/non-string values in ${localeFile}`).toEqual([]);
  });

  it.each(localeFiles.filter(name => name !== 'en.json'))(
    "%s: every value carries exactly en.json's {{interpolation}} tokens (plural forms may drop only {{count}})",
    localeFile => {
      const enEntries = entriesOf('en.json');
      const localeEntries = entriesOf(localeFile);
      const mismatched = Object.keys(enEntries)
        .filter(key => key in localeEntries)
        .filter(key => !tokensMatchEn(key, enEntries[key], localeEntries[key]))
        .map(
          key =>
            `${key}: en=[${tokensOf(enEntries[key])}] ${localeFile}=[${tokensOf(
              localeEntries[key],
            )}]`,
        );
      expect(mismatched, 'interpolation-token drift vs en.json').toEqual([]);
    },
  );
});
