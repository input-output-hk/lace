import i18n from 'i18next';

type I18NextResources = Partial<Record<SupportedLanguages, { translation: string }>>;

export enum SupportedLanguages {
  EN = 'en'
}

const resources: I18NextResources = {};
for (const lang of Object.values(SupportedLanguages)) {
  Object.assign(resources, {
    [lang]: {
      translation: { ...require(`./translations/${lang}.json`) }
    }
  });
}

// Create i18n instance with translations from this package
export default i18n.createInstance({
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  lng: 'en',
  resources,
  react: {
    useSuspense: false,
    transSupportBasicHtmlNodes: true
  }
});
