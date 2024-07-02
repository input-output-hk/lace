import 'i18next';
import type { CoreTranslations, SharedWalletsTranslations } from '@lace/translation';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: CoreTranslations & SharedWalletsTranslations;
    };
  }
}
