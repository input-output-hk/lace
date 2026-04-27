import type { I18nMessages, rawTranslations } from './translations';

export type TranslationKey = keyof I18nMessages;

export type TFunction = (
  k: TranslationKey,
  translationValues?: Record<string, string>,
) => string;

export interface I18nProvider {
  t: TFunction;
}

export type SupportedLanguage = keyof typeof rawTranslations;
