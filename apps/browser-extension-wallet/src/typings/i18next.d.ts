import 'i18next';
import { Translations } from '../lib/translations/types';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Translations;
    };
  }
}
