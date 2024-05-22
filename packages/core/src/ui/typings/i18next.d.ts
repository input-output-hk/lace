import 'i18next';
import type { Translations } from '@lace/translation';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Translations;
    };
  }
}
