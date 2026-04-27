import 'intl-pluralrules';
import { DEFAULT_LANGUAGE, translationResources } from '@lace-contract/i18n';

import type { SupportedLanguage } from '@lace-contract/i18n';
import type { Environment } from '@lace-contract/module';
import type { InitOptions, i18n } from 'i18next';

type I18nextInitParams = {
  i18next: i18n;
  environment: Environment;
  options?: InitOptions<unknown>;
  language: SupportedLanguage;
};

export const i18nextInit = async ({
  i18next,
  language,
  environment,
  options,
}: I18nextInitParams) => {
  await i18next.init({
    interpolation: {
      // not needed for react as it escapes by default
      escapeValue: false,
    },
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    debug: environment === 'development',
    resources: translationResources,
    supportedLngs: Object.keys(translationResources),
    ...options,
  });
};
