import { getI18n } from '@lace-contract/i18n';

import type { SupportedLanguage } from '@lace-contract/i18n';
import type { Store } from 'redux';

type LanguageSubscriptionParams = {
  store: Store;
  getLanguage: () => SupportedLanguage;
};

export const setupLanguageSubscription = ({
  store,
  getLanguage,
}: LanguageSubscriptionParams) => {
  store.subscribe(() => {
    const newLanguage = getLanguage();
    const currentLanguage = getI18n().language;

    if (newLanguage !== currentLanguage) {
      void getI18n().changeLanguage(newLanguage);
    }
  });
};
