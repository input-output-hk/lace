import { Language } from '@lace/common';
import { createInstance, i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './translations';

let i18nInstance: i18n;

export const getI18n = () => {
  if (!i18nInstance) throw new Error('i18n instance not initialized');
  return i18nInstance;
};

export const initI18n = () => {
  if (i18nInstance) return;

  i18nInstance = createInstance();
  i18nInstance.use(initReactI18next).init({
    fallbackLng: Language.en,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    lng: Language.en,
    resources: {
      [Language.en]: {
        translation: en,
      },
    },
    supportedLngs: Object.values(Language),
  });
};

export const changeLanguage = async (language: Language) => {
  if (!Object.values(Language).includes(language)) {
    throw new Error(`Attempted to switch to unsupported language "${language}"`);
  }
  console.debug(`Changing language to "${language}"`);

  await getI18n().changeLanguage(language);
};
