// To add a new language, add its bundle in bundles.ts.
import { rawTranslations } from './bundles';

import type { TranslationMessages } from './bundles';

export { rawTranslations } from './bundles';

// Each translation file exposes these keys for the language picker metadata.
type TranslationNameKey = 'translation.language.name';
type TranslationCodeKey = 'translation.language.code';

// Stash the key names to avoid repeating string literals throughout the file.
const PICK_NAME_KEY: TranslationNameKey = 'translation.language.name';
const PICK_CODE_KEY: TranslationCodeKey = 'translation.language.code';

// Utility to read the metadata entries from a flattened translation file.
const getTranslationString = (
  messages: Record<string, string>,
  key: TranslationCodeKey | TranslationNameKey,
) => messages[key];

const normaliseLanguageCode = (code: string) => code.toLowerCase();

export const DEFAULT_LANGUAGE = 'en';

// Read from the different translation files, a list with  the codes and names
// of the languages translated in their own language, to show the different
// options in the language picker.
export const availableLanguages = (
  Object.entries(rawTranslations) as Array<
    readonly [keyof typeof rawTranslations, TranslationMessages]
  >
).map(([fallbackCode, messages]) => {
  const flattenedMessages = messages as Record<string, string>;
  const definedCode = getTranslationString(flattenedMessages, PICK_CODE_KEY);
  const definedName = getTranslationString(flattenedMessages, PICK_NAME_KEY);

  const code = normaliseLanguageCode(definedCode ?? fallbackCode);
  const name = definedName ?? code;

  return { code, name, messages } as const;
});

// Cached list of codes for quick validation and iteration.
export const supportedLanguageCodes = availableLanguages.map(
  language => language.code,
);

// Shape that i18next expects when bootstrapping with preloaded resources.
export const translationResources = availableLanguages.reduce(
  (resources, language) => {
    resources[language.code] = {
      translation: language.messages,
    };
    return resources;
  },
  {} as Record<string, { translation: TranslationMessages }>,
);

// Type guard that confirms a persisted/user-supplied code is valid before use.
export const isSupportedLanguage = (
  language?: string | null,
): language is string =>
  typeof language === 'string' &&
  supportedLanguageCodes.includes(normaliseLanguageCode(language));

/**
 * Detects the user's system/device language and returns it if supported,
 * otherwise falls back to the default language.
 *
 * Works on React Native (iOS, Android) and Web via expo-localization.
 * Uses dynamic require to avoid loading expo-localization at module initialization
 * time, which would break Node.js environments (e.g., CI contract discovery).
 */
export const getSystemLanguage = (): keyof typeof rawTranslations => {
  try {
    // Dynamic require to avoid loading at module initialization time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as {
      getLocales: () => Array<{ languageCode?: string | null }>;
    };
    const locales = getLocales();
    const systemLanguageCode = locales[0]?.languageCode?.toLowerCase();

    if (systemLanguageCode && isSupportedLanguage(systemLanguageCode)) {
      return systemLanguageCode as keyof typeof rawTranslations;
    }
  } catch {
    // Fallback for environments where expo-localization is not available
  }

  return DEFAULT_LANGUAGE;
};

// https://medium.com/xgeeks/typescript-utility-keyof-nested-object-fa3e457ef2b2
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (number | string)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (number | string)];

export type I18nMessages = Record<NestedKeyOf<TranslationMessages>, string>;
