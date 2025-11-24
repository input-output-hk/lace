/* eslint-disable unicorn/prefer-export-from */
/* eslint-disable import/no-default-export */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable functional/no-loop-statements */
/* eslint-disable functional/immutable-data */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { Language } from '../types';

import { allTranslations } from './translations';

type I18NextResources = Partial<Record<Language, { translation: string }>>;

const DEFAULT_LANG = Language.en;

const resources: I18NextResources = {};
for (const lang of Object.values(Language)) {
  Object.assign(resources, {
    [lang]: {
      translation: {
        ...allTranslations[lang],
      },
    },
  });
}

const normalizeNavigatorLanguage = (input: Language | string): Language => {
  const code = String(input).toLowerCase();
  const base = code.split(/[_-]/)[0]; // "en-GB" -> "en", "es-XX" -> "es"
  switch (base) {
    case 'en': {
      return Language.en;
    }
    case 'es': {
      return Language.es;
    }
    default: {
      return DEFAULT_LANG;
    }
  }
};

export const initI18n = async (
  lang?: Language | string,
): Promise<typeof i18n> => {
  const resolved = normalizeNavigatorLanguage(lang ?? DEFAULT_LANG);

  if (i18n.isInitialized) {
    return i18n.changeLanguage(resolved).then(() => i18n);
  }

  return i18n
    .use(initReactI18next)
    .init({
      lng: resolved,
      fallbackLng: DEFAULT_LANG,
      resources,
      supportedLngs: Object.values(Language) as string[],
      nonExplicitSupportedLngs: true,
      lowerCaseLng: true,
      interpolation: { escapeValue: false },
      react: {
        useSuspense: false,
        transSupportBasicHtmlNodes: true,
      },
    })
    .then(() => i18n);
};

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
