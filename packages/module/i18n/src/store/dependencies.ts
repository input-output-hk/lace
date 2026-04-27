import { t } from 'i18next';

import type { I18nProvider } from '@lace-contract/i18n';
import type { LaceInitSync } from '@lace-contract/module';

export const initializeDependencies: LaceInitSync<I18nProvider> = () => {
  return { t };
};
