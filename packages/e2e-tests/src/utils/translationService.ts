import { flatten } from 'flat';
import { readFromFile } from './fileUtils';

const loadTranslations = async function (isCoreTranslation: boolean) {
  const language = process.env.LACE_LOCALE ?? 'en';

  const extensionTranslationPath = `../../../../apps/browser-extension-wallet/src/lib/translations/${language}.json`;
  const coreTranslationPath = `../../../../packages/core/dist/translations/${language}.json`;

  const translationsFilePath = isCoreTranslation ? coreTranslationPath : extensionTranslationPath;
  const stringStream = readFromFile(__dirname, translationsFilePath);
  return await flatten(JSON.parse(stringStream.toString()));
};
let extensionTranslations: { [index: string]: any };
let coreTranslations: { [index: string]: any };

export const t = async (key: string, isCoreTranslation = false): Promise<string> => {
  extensionTranslations = extensionTranslations ?? (await loadTranslations(false));
  coreTranslations = coreTranslations ?? (await loadTranslations(true));

  return isCoreTranslation ? coreTranslations[key] : extensionTranslations[key];
};
