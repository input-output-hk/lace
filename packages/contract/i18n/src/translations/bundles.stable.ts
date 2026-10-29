// The stable SDK build resolves this file in place of bundles.ts: the SDK runs
// headless and shows no text, so it ships no translation bundle, and a
// translation key is any string.

export const rawTranslations = {
  en: {
    'translation.language.name': 'English',
    'translation.language.code': 'en',
  } as Record<string, string>,
} as const;

/** The messages of one language, keyed by translation key. */
export type TranslationMessages = Record<string, string>;
