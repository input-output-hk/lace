import { pinDefaultNumberLocale } from '@lace-lib/util-dev';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Production calls getLocaleSeparators() with NO argument, so it resolves the
// device locale. Every other test here passes an explicit tag, which exercises
// a path the app never takes. This matrix drives the no-argument path.
//
// EXCLUDED: locales on a non-Latin numbering system (ar, fa, and the Arabic
// script generally). parseLocaleNumber whitelists ASCII digits and separators
// before consulting the derived ones, so the round trip below cannot pass
// there. That is a separate pre-existing defect in the parser, not the
// derivation, so these tags are named here rather than silently absent.
const LOCALES = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-PT',
  'pl-PL',
  'bg-BG',
  'hu-HU',
  'sl-SI',
  'et-EE',
  'lv-LV',
  'hi-IN',
  'bn-BD',
  'ru-RU',
  'nl-NL',
  'tr-TR',
];

describe('device locale, with no explicit tag', () => {
  beforeEach(() => {
    // The derived separators are memoised under the 'default' key, so the
    // module registry has to be dropped between locales or every case after
    // the first would reuse the first one's separators.
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it.each(LOCALES)(
    'derives the separators ICU reports for %s',
    async locale => {
      pinDefaultNumberLocale(locale);
      const { getLocaleSeparators } = await import('../src/format-number');

      const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);

      expect(getLocaleSeparators()).toEqual({
        groupSeparator: parts.find(part => part.type === 'group')?.value,
        decimalSeparator: parts.find(part => part.type === 'decimal')?.value,
      });
    },
  );

  // NOT coverage of the derivation: both halves read the same cached
  // separators, so a wrong-but-self-consistent pair round trips perfectly and
  // this passes under a full revert. What it does guard is parseLocaleNumber
  // building a regex from the group separator, so only the separators that are
  // regex-special or whitespace are worth listing here.
  it.each(['de-DE', 'fr-FR', 'en-US'])(
    'round trips format then parse for %s',
    async locale => {
      pinDefaultNumberLocale(locale);
      const { formatLocaleNumber, parseLocaleNumber } = await import(
        '../src/format-number'
      );

      expect(Number(parseLocaleNumber(formatLocaleNumber('1234567.89')))).toBe(
        1234567.89,
      );
    },
  );
});
