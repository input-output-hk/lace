/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable unicorn/prefer-module */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

type I18NextResources = Partial<Record<SupportedLanguages, { translation: string }>>;

export enum SupportedLanguages {
  EN = 'en'
}
const DEFAULT_LANG = SupportedLanguages.EN;

const resources: I18NextResources = {};
for (const lang of Object.values(SupportedLanguages)) {
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
    // not needed for react as it escapes by default
    escapeValue: false
  },
  lng: SupportedLanguages.EN,
  resources,
  react: {
    useSuspense: false,
    transSupportBasicHtmlNodes: true
  }
});

export { default } from 'i18next';
