import { flatten } from 'flat';
import { readFromFile } from './fileUtils';
import { en as staking } from '../../../staking/src/features/i18n/translations/en';

type TranslationsOrigin = 'base' | 'staking';
type Translations = { [index: string]: any };

const loadTranslations = async function (translationOrigin: TranslationsOrigin) {
  const language = process.env.LACE_LOCALE ?? 'en';

  const extensionTranslationPath = `../../../../packages/translation/src/lib/translations/browser-extension-wallet/${language}.json`;
  const coreTranslationPath = `../../../../packages/translation/src/lib/translations/core/${language}.json`;

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
