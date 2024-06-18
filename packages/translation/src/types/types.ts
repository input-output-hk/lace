import type {
  allTranslations,
  coreTranslations,
  sharedWalletsTranslations,
} from '../lib/translations';

export enum Language {
  en = 'en',
}

export type TranslationKey = keyof (typeof allTranslations)[Language.en];
export type Translations = { [K in TranslationKey]: string };

export type CoreTranslationKey = keyof (typeof coreTranslations)[Language.en];
export type CoreTranslations = { [K in CoreTranslationKey]: string };

export type SharedWalletsTranslationKey =
  keyof (typeof sharedWalletsTranslations)[Language.en];
export type SharedWalletsTranslations = {
  [K in SharedWalletsTranslationKey]: string;
};
