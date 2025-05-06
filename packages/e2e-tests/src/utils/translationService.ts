import { flatten } from 'flat';
import { readFromFile } from './fileUtils';

type TranslationsOrigin = 'base' | 'staking'; // FIXME: remove this type and translationOrigin parameter when all usages of await t(.*, 'staking') are replaced with await t(.*)
type Translations = { [index: string]: any };

const loadTranslations = async function (translationOrigin: TranslationsOrigin) {
  const language = process.env.LACE_LOCALE ?? 'en';

  const extensionTranslationPath = `../../../../packages/translation/src/lib/translations/browser-extension-wallet/${language}.json`;
  const coreTranslationPath = `../../../../packages/translation/src/lib/translations/core/${language}.json`;
  const cardanoTranslationPath = `../../../../packages/translation/src/lib/translations/cardano/${language}.json`;
  const sharedWalletsTranslationPath = `../../../../packages/translation/src/lib/translations/shared-wallets/${language}.json`;
  const stakingTranslationPath = `../../../../packages/translation/src/lib/translations/staking/${language}.json`;

  const extension: Translations = await flatten(
    JSON.parse(readFromFile(import.meta.dirname, extensionTranslationPath).toString())
  );
  const core: Translations = await flatten(
    JSON.parse(readFromFile(import.meta.dirname, coreTranslationPath).toString())
  );
  const cardano: Translations = await flatten(
    JSON.parse(readFromFile(import.meta.dirname, cardanoTranslationPath).toString())
  );
  const sharedWallets: Translations = await flatten(
    JSON.parse(readFromFile(import.meta.dirname, sharedWalletsTranslationPath).toString())
  );
  const staking: Translations = await flatten(
    JSON.parse(readFromFile(import.meta.dirname, stakingTranslationPath).toString())
  );
  const baseTranslations = {
    ...cardano,
    ...core,
    ...extension,
    ...sharedWallets,
    ...staking
  };
  return translationOrigin === 'base' ? baseTranslations : staking;
};

export const t = async (key: string, translationOrigin: TranslationsOrigin = 'base'): Promise<string> =>
  (await loadTranslations(translationOrigin))[key];
