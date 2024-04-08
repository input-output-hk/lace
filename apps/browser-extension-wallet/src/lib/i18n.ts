/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable unicorn/prefer-module */
import { Language } from '@lace/common';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

type I18NextResources = Partial<Record<Language, { translation: string }>>;

const DEFAULT_LANG = Language.en;

const resources: I18NextResources = {};
for (const lang of Object.values(Language)) {
  Object.assign(resources, {
    [lang]: {
      translation: {
        ...require(`./translations/${lang}.json`),
        ...require(`./translations/legal.${lang}.ts`).default,
        ...require(`./translations/cookie-policy.${lang}.ts`).default
      }
    }
  });
}

i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LANG,
  interpolation: {
    escapeValue: false
  },
  lng: Language.en,
  resources,
  react: {
    useSuspense: false,
    transSupportBasicHtmlNodes: true
  }
});

export default i18n;
