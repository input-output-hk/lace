import { flatten } from 'flat';
import { readFromFile } from './fileUtils';
import { en as staking } from '../../../staking/src/features/i18n/translations/en';

type TranslationsOrigin = 'base' | 'staking';
type Translations = { [index: string]: any };

const loadTranslations = async function (translationOrigin: TranslationsOrigin) {
  const language = process.env.LACE_LOCALE ?? 'en';

  const extensionTranslationPath = `../../../../apps/browser-extension-wallet/src/lib/translations/${language}.json`;
  const coreTranslationPath = `../../../../packages/core/dist/translations/${language}.json`;

  const extension: Translations = await flatten(
    JSON.parse(readFromFile(__dirname, extensionTranslationPath).toString())
  );
  const core: Translations = await flatten(JSON.parse(readFromFile(__dirname, coreTranslationPath).toString()));
  const baseTranslations = {
    ...core,
    ...extension
  };
  return translationOrigin === 'base' ? baseTranslations : staking;
};

export const t = async (key: string, translationOrigin: TranslationsOrigin = 'base'): Promise<string> =>
  (await loadTranslations(translationOrigin))[key];
