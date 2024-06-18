import 'i18next';
import type { SharedWalletsTranslations } from '@lace/translation';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: SharedWalletsTranslations;
    };
  }
}
