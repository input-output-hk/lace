import type { allTranslations, coreTranslations } from '../lib/translations';

export enum Language {
  en = 'en',
}

export type TranslationKey = keyof (typeof allTranslations)[Language.en];
export type Translations = { [K in TranslationKey]: string };

export type CoreTranslationKey = keyof (typeof coreTranslations)[Language.en];
export type CoreTranslations = { [K in CoreTranslationKey]: string };
