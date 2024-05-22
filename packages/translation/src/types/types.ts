import type { en } from '../lib/translations';

export type TranslationKey = keyof typeof en;

export type Translations = { [K in TranslationKey]: string };
