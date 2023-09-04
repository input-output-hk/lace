import { flatten } from 'flat';
import { readFromFile } from './fileUtils';
import { en } from '../../../staking/src/features/i18n/translations/en';

const loadTranslations = async function (translationType = 'base') {
  const language = process.env.LACE_LOCALE ?? 'en';

  const extensionTranslationPath = `../../../../apps/browser-extension-wallet/src/lib/translations/${language}.json`;
  const coreTranslationPath = `../../../../packages/core/dist/translations/${language}.json`;

  let stringStream;
  switch (translationType) {
    case 'base':
      stringStream = await flatten(JSON.parse(readFromFile(__dirname, extensionTranslationPath).toString()));
      break;
    case 'core':
      stringStream = await flatten(JSON.parse(readFromFile(__dirname, coreTranslationPath).toString()));
      break;
    case 'staking':
      stringStream = en;
      break;
  }

  return stringStream;
};
let translations: { [index: string]: any };

export const t = async (key: string, translationType = 'base'): Promise<string> => {
  translations = await loadTranslations(translationType);
  return translations[key];
};
