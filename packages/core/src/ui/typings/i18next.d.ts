import 'i18next';
import type { CoreTranslations } from '@lace/translation';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: CoreTranslations;
    };
  }
}
