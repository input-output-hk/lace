/* eslint-disable unicorn/prefer-export-from */
/* eslint-disable import/no-default-export */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable functional/no-loop-statements */
/* eslint-disable functional/immutable-data */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import * as translations from './translations';

export enum Language {
  en = 'en',
}

type I18NextResources = Partial<Record<Language, { translation: string }>>;

const DEFAULT_LANG = Language.en;

const resources: I18NextResources = {};
for (const lang of Object.values(Language)) {
  Object.assign(resources, {
    [lang]: {
      translation: {
        ...translations[lang],
      },
    },
  });
}

i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LANG,
  interpolation: {
    // not needed for react as it escapes by default
    escapeValue: false,
  },
  lng: Language.en,
  resources,
  react: {
    useSuspense: false,
    transSupportBasicHtmlNodes: true,
  },
});

export default i18n;
