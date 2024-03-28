import { en } from './en';

export type TranslationKey = keyof typeof en;

export type Translations = { [K in TranslationKey]: string };
